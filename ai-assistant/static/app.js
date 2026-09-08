// ===== 工具函数 =====
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function api(method, url, body) {
  const opt = { method, headers: {} };
  if (body !== undefined) {
    opt.headers["Content-Type"] = "application/json";
    opt.body = JSON.stringify(body);
  }
  const r = await fetch(url, opt);
  if (!r.ok) {
    let msg = `${r.status}`;
    try { const j = await r.json(); msg = j.detail || JSON.stringify(j); } catch (_) {}
    throw new Error(msg);
  }
  return r.json();
}

// ===== 状态 =====
let history = [];
let streaming = false;

// ===== 对话渲染 =====
function renderMsg(role, content, extra = {}) {
  const box = $("messages");
  const div = document.createElement("div");
  div.className = `msg ${role === "user" ? "user" : "bot"}${extra.err ? " err" : ""}`;
  let html = esc(content);
  if (role !== "user" && extra.time) html += `<span class="meta">${esc(extra.time)}</span>`;
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function setStatus(state, text) {
  const dot = $("statusDot");
  dot.className = "dot " + state;
  $("statusText").textContent = text;
}

// ===== 发送对话（SSE 流式） =====
async function send() {
  const input = $("input");
  const text = input.value.trim();
  if (!text || streaming) return;
  input.value = "";
  renderMsg("user", text);
  history.push({ role: "user", content: text });

  const overrides = collectOverrides();
  const useTrain = $("pUseTrain").checked;
  const useTime = $("pUseTime").checked;

  streaming = true;
  setStatus("busy", "生成中…");
  const botBox = renderMsg("assistant", "");
  let buf = "";
  let respTime = "";

  try {
    const resp = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: text, history: history.slice(0, -1),
        overrides, use_training: useTrain, inject_time: useTime,
      }),
    });
    if (!resp.ok) throw new Error((await resp.text()).slice(0, 300));

    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let sseBuf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuf += dec.decode(value, { stream: true });
      const lines = sseBuf.split("\n");
      sseBuf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (!payload) continue;
        try {
          const o = JSON.parse(payload);
          if (o.delta) { buf += o.delta; botBox.innerHTML = esc(buf); $("messages").scrollTop = 1e9; }
          if (o.time) respTime = o.time;
          if (o.error) throw new Error(o.error);
          if (o.done) break;
        } catch (e) { /* 忽略解析错误 */ }
      }
    }
    if (!buf) botBox.innerHTML = esc("(空响应)");
    if (respTime) {
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = respTime;
      botBox.appendChild(meta);
    }
    history.push({ role: "assistant", content: buf });
    setStatus("ok", "就绪");
  } catch (e) {
    botBox.classList.add("err");
    botBox.innerHTML = "调用失败：" + esc(e.message);
    setStatus("err", "错误");
  } finally {
    streaming = false;
  }
}

function collectOverrides() {
  return {
    model: $("pModel").value || undefined,
    temperature: parseFloat($("pTemp").value),
    top_p: parseFloat($("pTopP").value),
    max_tokens: parseInt($("pMaxTok").value, 10),
    presence_penalty: parseFloat($("pPP").value),
    frequency_penalty: parseFloat($("pFP").value),
    system_prompt: $("pSys").value || undefined,
  };
}

// ===== 参数面板联动 =====
function bindSliders() {
  [["pTemp", "vTemp"], ["pTopP", "vTopP"], ["pPP", "vPP"], ["pFP", "vFP"]].forEach(([sid, vid]) => {
    $(sid).addEventListener("input", () => { $(vid).textContent = $(sid).value; });
  });
}

// ===== 加载设置到面板 =====
async function loadSettings() {
  try {
    const s = await api("GET", "/api/settings");
    $("sBaseUrl").value = s.base_url || "";
    $("sModel").value = s.model || "";
    $("sApiKey").value = s.api_key || "";
    $("sSys").value = s.system_prompt || "";

    $("pModel").value = s.model || "";
    $("pTemp").value = s.temperature || 0.7;
    $("pTopP").value = s.top_p || 0.9;
    $("pMaxTok").value = s.max_tokens || 2048;
    $("pPP").value = s.presence_penalty || 0;
    $("pFP").value = s.frequency_penalty || 0;
    $("pSys").value = s.system_prompt || "";
    $("pUseTrain").checked = s.use_training !== "0";
    $("pUseTime").checked = s.inject_time !== "0";
    ["vTemp", "vTopP", "vPP", "vFP"].forEach((id, i) => {
      $(id).textContent = [s.temperature, s.top_p, s.presence_penalty, s.frequency_penalty][i] ?? $(id).textContent;
    });
  } catch (e) { console.error(e); }
}

async function saveSettings() {
  try {
    await api("PUT", "/api/settings", {
      base_url: $("sBaseUrl").value.trim(),
      model: $("sModel").value.trim(),
      api_key: $("sApiKey").value.trim(),
      system_prompt: $("sSys").value,
    });
    $("dlgSettings").close();
    await loadSettings();
    setStatus("ok", "设置已保存");
  } catch (e) { alert("保存失败：" + e.message); }
}

// ===== 预设 =====
async function loadPresets() {
  try {
    const list = await api("GET", "/api/presets");
    const sel = $("presetSel");
    sel.innerHTML = "";
    list.forEach(p => {
      const o = document.createElement("option");
      o.value = p.id; o.textContent = p.name;
      o.dataset.data = JSON.stringify(p);
      sel.appendChild(o);
    });
  } catch (e) { console.error(e); }
}

function applyPreset() {
  const opt = $("presetSel").selectedOptions[0];
  if (!opt) return;
  const p = JSON.parse(opt.dataset.data);
  if (p.temperature != null) $("pTemp").value = p.temperature, $("vTemp").textContent = p.temperature;
  if (p.top_p != null) $("pTopP").value = p.top_p, $("vTopP").textContent = p.top_p;
  if (p.max_tokens != null) $("pMaxTok").value = p.max_tokens;
  if (p.presence_penalty != null) $("pPP").value = p.presence_penalty, $("vPP").textContent = p.presence_penalty;
  if (p.frequency_penalty != null) $("pFP").value = p.frequency_penalty, $("vFP").textContent = p.frequency_penalty;
  if (p.system_prompt) $("pSys").value = p.system_prompt;
  if (p.model) $("pModel").value = p.model;
}

async function savePreset() {
  const name = prompt("预设名称：", "我的预设");
  if (!name) return;
  try {
    await api("POST", "/api/presets", {
      name, temperature: parseFloat($("pTemp").value),
      top_p: parseFloat($("pTopP").value),
      max_tokens: parseInt($("pMaxTok").value, 10),
      presence_penalty: parseFloat($("pPP").value),
      frequency_penalty: parseFloat($("pFP").value),
      system_prompt: $("pSys").value,
      model: $("pModel").value,
    });
    await loadPresets();
  } catch (e) { alert("保存失败：" + e.message); }
}

// ===== 训练样本 =====
async function loadTraining() {
  const tag = $("trFilter").value;
  const list = await api("GET", `/api/training${tag ? "?tag=" + encodeURIComponent(tag) : ""}`);
  const ul = $("trList");
  ul.innerHTML = "";
  list.forEach(s => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="role-tag">${esc(s.role)}${s.tag ? " · " + esc(s.tag) : ""}</span>
      <span class="content">${esc(s.content)}</span>
      <div class="row"><span>${new Date(s.created_at * 1000).toLocaleString()}</span>
        <button class="btn small danger" data-id="${s.id}">删除</button></div>`;
    li.querySelector("button").onclick = async () => {
      await api("DELETE", `/api/training/${s.id}`);
      await loadTraining();
    };
    ul.appendChild(li);
  });
  // 更新筛选下拉
  const tags = await api("GET", "/api/training/tags");
  const cur = $("trFilter").value;
  $("trFilter").innerHTML = '<option value="">全部</option>' +
    tags.map(t => `<option value="${esc(t)}" ${t === cur ? "selected" : ""}>${esc(t)}</option>`).join("");
}

async function addTraining() {
  const role = $("trRole").value;
  const content = $("trContent").value.trim();
  const tag = $("trTag").value.trim();
  if (!content) return alert("内容不能为空");
  try {
    await api("POST", "/api/training", { role, content, tag });
    $("trContent").value = "";
    $("trTag").value = "";
    await loadTraining();
  } catch (e) { alert("添加失败：" + e.message); }
}

// ===== API Key =====
async function loadKeys() {
  const list = await api("GET", "/api/keys");
  const ul = $("keyList");
  ul.innerHTML = "";
  list.forEach(k => {
    const li = document.createElement("li");
    const active = k.is_active === 1;
    li.innerHTML = `
      <div class="row"><strong>${esc(k.name || "(未命名)")}</strong>
        <button class="btn small" data-act="toggle" data-id="${k.id}">${active ? "停用" : "启用"}</button>
        <button class="btn small danger" data-act="del" data-id="${k.id}">删除</button></div>
      <div class="content"><code>${esc(k.key)}</code></div>
      <div class="row"><span>创建 ${new Date(k.created_at * 1000).toLocaleString()} · 调用 ${k.call_count} 次</span>
        <button class="btn small" data-act="copy" data-key="${esc(k.key)}">复制</button></div>`;
    li.querySelectorAll("button").forEach(b => b.onclick = async () => {
      const act = b.dataset.act;
      const id = b.dataset.id;
      if (act === "del") await api("DELETE", `/api/keys/${id}`);
      else if (act === "toggle") await api("PATCH", `/api/keys/${id}`, { active: !active });
      else if (act === "copy") { await navigator.clipboard.writeText(b.dataset.key); alert("已复制"); return; }
      await loadKeys();
    });
    ul.appendChild(li);
  });
}

async function createKey() {
  const name = $("keyName").value.trim();
  await api("POST", "/api/keys", { name });
  $("keyName").value = "";
  await loadKeys();
}

// ===== 系统时间刷新 =====
async function refreshTime() {
  try {
    const r = await fetch("/health");
    const j = await r.json();
    $("btnTime").textContent = "⏱ " + new Date(j.time).toLocaleString("zh-CN", { hour12: false });
  } catch (_) {}
}

// ===== 初始化 =====
function bindUI() {
  bindSliders();
  $("btnSend").onclick = send;
  $("input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
  });
  $("btnClear").onclick = async () => {
    if (!confirm("清空当前对话？历史记录仍保留在数据库。")) return;
    $("messages").innerHTML = "";
    history = [];
    await api("DELETE", "/api/conversations");
  };
  $("btnSettings").onclick = () => $("dlgSettings").showModal();
  $("btnSaveSettings").onclick = saveSettings;
  $("btnTraining").onclick = async () => { await loadTraining(); $("dlgTraining").showModal(); };
  $("btnAddTraining").onclick = addTraining;
  $("btnKeys").onclick = async () => { await loadKeys(); $("dlgKeys").showModal(); };
  $("btnCreateKey").onclick = createKey;
  $("btnHelp").onclick = async () => {
    const f = $("helpFrame");
    if (!f.dataset.loaded) {
      f.src = "/static/help.html";
      f.onload = () => f.dataset.loaded = "1";
    }
    $("dlgHelp").showModal();
  };
  $("btnApplyPreset").onclick = applyPreset;
  $("btnSavePreset").onclick = savePreset;
  $("btnToggleSide").onclick = () => $("sidePanel").classList.toggle("collapsed");
  $("trFilter").onchange = loadTraining;
}

(async function init() {
  bindUI();
  await loadSettings();
  await loadPresets();
  setStatus("ok", "就绪");
  refreshTime();
  setInterval(refreshTime, 30000);
})();
