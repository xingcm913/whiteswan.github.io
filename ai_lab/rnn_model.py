"""
字符级 RNN 神经网络 —— 纯 numpy 手写实现
======================================
完全透明:前向传播、BPTT 反向传播、Adam 优化器全部手写,
可以看到"AI 模型是怎么训练的"。

网络结构(经典 Char-RNN):
    x_t (one-hot)  ──>  h_t = tanh(W_xh @ x_t + W_hh @ h_{t-1} + b_h)  ──>  y_t = W_hy @ h_t + b_y
                                                                                   └─> p_t = softmax(y_t)

损失:交叉熵
反向传播:BPTT (Backpropagation Through Time)
"""

import numpy as np
import pickle
import os


class CharRNN:
    def __init__(self, hidden_size=128, learning_rate=0.001, seq_len=50,
                 vocab=None, seed=None):
        """
        :param hidden_size: 隐藏层神经元数量
        :param learning_rate: 学习率
        :param seq_len: BPTT 截断长度
        :param vocab: 字符词汇表(list),若为 None 需后续 set_vocab
        :param seed: 随机种子(可复现)
        """
        self.hidden_size = hidden_size
        self.lr = learning_rate
        self.seq_len = seq_len
        self.vocab = list(vocab) if vocab is not None else None
        self.char_to_idx = {c: i for i, c in enumerate(self.vocab)} if self.vocab else None
        self.idx_to_char = {i: c for i, c in enumerate(self.vocab)} if self.vocab else None
        self.vocab_size = len(self.vocab) if self.vocab else 0

        rng = np.random.default_rng(seed)
        self._rng = rng

        # 参数(权重)延迟到 set_vocab 后再初始化
        self.params = None
        # Adam 状态
        self._adam_m = None
        self._adam_v = None
        self._adam_t = 0
        self.beta1, self.beta2, self.eps = 0.9, 0.999, 1e-8

        # 训练统计
        self.iteration = 0
        self.smooth_loss = None
        # 若构造时已给词汇表,立即初始化权重
        if self.vocab is not None:
            self._init_params()
            self.smooth_loss = -np.log(1.0 / self.vocab_size) * self.seq_len

    # ---------------- 词汇表 ----------------
    def set_vocab(self, vocab):
        self.vocab = list(vocab)
        self.char_to_idx = {c: i for i, c in enumerate(self.vocab)}
        self.idx_to_char = {i: c for i, c in enumerate(self.vocab)}
        self.vocab_size = len(self.vocab)
        self._init_params()
        self.smooth_loss = -np.log(1.0 / self.vocab_size) * self.seq_len

    def _init_params(self):
        """Xavier/He 初始化"""
        rng = self._rng
        V, H = self.vocab_size, self.hidden_size
        scale_xh = np.sqrt(1.0 / V)
        scale_hh = np.sqrt(1.0 / H)
        scale_hy = np.sqrt(1.0 / H)
        self.params = {
            'W_xh': (rng.standard_normal((H, V)) * scale_xh).astype(np.float64),
            'W_hh': (rng.standard_normal((H, H)) * scale_hh).astype(np.float64),
            'b_h':  np.zeros((H, 1)),
            'W_hy': (rng.standard_normal((V, H)) * scale_hy).astype(np.float64),
            'b_y':  np.zeros((V, 1)),
        }
        # Adam 状态
        self._adam_m = {k: np.zeros_like(v) for k, v in self.params.items()}
        self._adam_v = {k: np.zeros_like(v) for k, v in self.params.items()}
        self._adam_t = 0

    # ---------------- 前向传播 ----------------
    def forward(self, x_indices, h_prev=None):
        """
        对一个输入序列做前向传播,并缓存用于反向传播。
        :param x_indices: list[int],输入字符索引序列(长度 T)
        :param h_prev: 初始隐藏状态 (H,1)
        :return: probs, cache
        """
        T = len(x_indices)
        V, H = self.vocab_size, self.hidden_size
        p = self.params
        if h_prev is None:
            h_prev = np.zeros((H, 1))

        xs, hs, ys, ps = {}, {}, {}, {}
        hs[-1] = h_prev.copy()

        for t in range(T):
            xs[t] = np.zeros((V, 1))
            xs[t][x_indices[t]] = 1.0
            hs[t] = np.tanh(p['W_xh'] @ xs[t] + p['W_hh'] @ hs[t-1] + p['b_h'])
            ys[t] = p['W_hy'] @ hs[t] + p['b_y']
            # softmax(数值稳定)
            y = ys[t] - np.max(ys[t])
            ps[t] = np.exp(y)
            ps[t] /= np.sum(ps[t])

        cache = {'xs': xs, 'hs': hs, 'ps': ps, 'h_prev': h_prev}
        return ps, cache

    # ---------------- 损失 + 反向传播 (BPTT) ----------------
    def loss_and_grads(self, x_indices, y_indices, h_prev=None):
        """
        :param x_indices: 输入序列
        :param y_indices: 目标序列(长度与 x 相同)
        :return: loss, grads, h_last
        """
        T = len(x_indices)
        ps, cache = self.forward(x_indices, h_prev)
        xs, hs = cache['xs'], cache['hs']

        # 交叉熵损失
        loss = 0.0
        for t in range(T):
            loss += -np.log(ps[t][y_indices[t], 0] + 1e-12)

        # 反向传播
        V, H = self.vocab_size, self.hidden_size
        grads = {k: np.zeros_like(v) for k, v in self.params.items()}
        dh_next = np.zeros((H, 1))

        for t in reversed(range(T)):
            dy = ps[t].copy()
            dy[y_indices[t]] -= 1.0  # softmax + CE 的梯度: p - y
            grads['W_hy'] += dy @ hs[t].T
            grads['b_y'] += dy
            dh = self.params['W_hy'].T @ dy + dh_next
            # tanh 导数
            dh_raw = (1 - hs[t] ** 2) * dh
            grads['b_h'] += dh_raw
            grads['W_xh'] += dh_raw @ xs[t].T
            grads['W_hh'] += dh_raw @ hs[t-1].T
            dh_next = self.params['W_hh'].T @ dh_raw

        # 梯度裁剪(防止梯度爆炸)
        total_norm = np.sqrt(sum(np.sum(g * g) for g in grads.values()))
        if total_norm > 5.0:
            scale = 5.0 / (total_norm + 1e-6)
            for k in grads:
                grads[k] *= scale

        return loss, grads, hs[T-1]

    # ---------------- Adam 优化器步进 ----------------
    def step(self, grads):
        self._adam_t += 1
        t = self._adam_t
        b1, b2, eps = self.beta1, self.beta2, self.eps
        for k in self.params:
            g = grads[k]
            self._adam_m[k] = b1 * self._adam_m[k] + (1 - b1) * g
            self._adam_v[k] = b2 * self._adam_v[k] + (1 - b2) * (g * g)
            m_hat = self._adam_m[k] / (1 - b1 ** t)
            v_hat = self._adam_v[k] / (1 - b2 ** t)
            self.params[k] -= self.lr * m_hat / (np.sqrt(v_hat) + eps)
        self.iteration += 1

    # ---------------- 采样生成 ----------------
    def sample(self, seed_text="", length=200, temperature=1.0, top_k=0):
        """
        从模型采样生成文本。
        :param seed_text: 种子文本
        :param length: 生成字符数
        :param temperature: 温度,越高越随机
        :param top_k: 0 表示不限制,>0 表示只在前 k 个概率中采样
        """
        if self.params is None:
            return ""
        V, H = self.vocab_size, self.hidden_size
        h = np.zeros((H, 1))
        # 用 seed 预热隐藏状态
        for ch in seed_text:
            if ch not in self.char_to_idx:
                continue
            x = np.zeros((V, 1))
            x[self.char_to_idx[ch]] = 1.0
            h = np.tanh(self.params['W_xh'] @ x + self.params['W_hh'] @ h + self.params['b_h'])

        # 起始字符(作为第一次预测的输入,不放入输出,避免重复种子末字符)
        if seed_text and seed_text[-1] in self.char_to_idx:
            last_idx = self.char_to_idx[seed_text[-1]]
        else:
            last_idx = int(self._rng.integers(0, V))
        out = []

        for _ in range(length):
            x = np.zeros((V, 1))
            x[last_idx] = 1.0
            h = np.tanh(self.params['W_xh'] @ x + self.params['W_hh'] @ h + self.params['b_h'])
            y = self.params['W_hy'] @ h + self.params['b_y']
            y = y.flatten() / max(temperature, 1e-6)
            # top-k
            if top_k > 0 and top_k < V:
                idx_sorted = np.argsort(y)[::-1]
                mask = np.full_like(y, -np.inf)
                mask[idx_sorted[:top_k]] = y[idx_sorted[:top_k]]
                y = mask
            y = y - np.max(y)
            p = np.exp(y)
            p /= np.sum(p)
            last_idx = int(self._rng.choice(V, p=p))
            out.append(self.idx_to_char[last_idx])

        return ''.join(out)

    # ---------------- 单步前向(调试用) ----------------
    def forward_single(self, char, h_prev):
        """对单个字符做一次前向,返回 (char_prob, new_h),用于调试面板"""
        if char not in self.char_to_idx:
            return None, h_prev
        x = np.zeros((self.vocab_size, 1))
        x[self.char_to_idx[char]] = 1.0
        h = np.tanh(self.params['W_xh'] @ x + self.params['W_hh'] @ h_prev + self.params['b_h'])
        y = self.params['W_hy'] @ h + self.params['b_y']
        y = y - np.max(y)
        p = np.exp(y)
        p /= np.sum(p)
        return p.flatten(), h

    # ---------------- 保存 / 加载 ----------------
    def save(self, path):
        state = {
            'hidden_size': self.hidden_size,
            'lr': self.lr,
            'seq_len': self.seq_len,
            'vocab': self.vocab,
            'params': {k: v.tolist() for k, v in self.params.items()} if self.params else None,
            'iteration': self.iteration,
            'smooth_loss': self.smooth_loss,
            'adam_t': self._adam_t,
            'adam_m': {k: v.tolist() for k, v in self._adam_m.items()} if self._adam_m else None,
            'adam_v': {k: v.tolist() for k, v in self._adam_v.items()} if self._adam_v else None,
        }
        with open(path, 'wb') as f:
            pickle.dump(state, f)

    def load(self, path):
        with open(path, 'rb') as f:
            state = pickle.load(f)
        self.hidden_size = state['hidden_size']
        self.lr = state['lr']
        self.seq_len = state['seq_len']
        self.set_vocab(state['vocab'])
        if state['params'] is not None:
            for k in self.params:
                self.params[k] = np.array(state['params'][k])
            self.iteration = state['iteration']
            self.smooth_loss = state['smooth_loss']
            self._adam_t = state['adam_t']
            if state['adam_m']:
                for k in self._adam_m:
                    self._adam_m[k] = np.array(state['adam_m'][k])
                    self._adam_v[k] = np.array(state['adam_v'][k])

    def model_info(self):
        """返回模型结构信息(供调试面板展示)"""
        if self.params is None:
            return {'status': 'uninitialized', 'vocab_size': 0, 'hidden_size': self.hidden_size}
        total = 0
        shapes = {}
        for k, v in self.params.items():
            shapes[k] = list(v.shape)
            total += int(np.prod(v.shape))
        return {
            'status': 'initialized',
            'vocab_size': self.vocab_size,
            'vocab': self.vocab,
            'hidden_size': self.hidden_size,
            'learning_rate': self.lr,
            'seq_len': self.seq_len,
            'iteration': self.iteration,
            'smooth_loss': float(self.smooth_loss) if self.smooth_loss is not None else None,
            'param_shapes': shapes,
            'total_params': total,
        }
