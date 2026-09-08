// ===== 主题切换 =====
const themeToggle = document.getElementById('themeToggle');
const root = document.documentElement;

function getPreferredTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

applyTheme(getPreferredTheme());

themeToggle.addEventListener('click', () => {
    const current = root.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ===== 移动端菜单 =====
const navBurger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');

navBurger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navBurger.classList.toggle('open', open);
    navBurger.setAttribute('aria-expanded', String(open));
});

navLinks.querySelectorAll('.nav__link').forEach((link) => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navBurger.classList.remove('open');
        navBurger.setAttribute('aria-expanded', 'false');
    });
});

// ===== 导航滚动状态 + 活动高亮 =====
const nav = document.getElementById('nav');
const sections = Array.from(document.querySelectorAll('main section[id]'));
const linkMap = new Map();
navLinks.querySelectorAll('.nav__link').forEach((l) => {
    const id = l.getAttribute('href').slice(1);
    linkMap.set(id, l);
});

function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 20);

    // 活动高亮：找到当前在视口中部的 section
    const mid = window.scrollY + window.innerHeight * 0.4;
    let activeId = null;
    for (const sec of sections) {
        if (sec.offsetTop <= mid) activeId = sec.id;
    }
    linkMap.forEach((l, id) => l.classList.toggle('active', id === activeId));
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ===== 滚动揭示动画 =====
const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
);
reveals.forEach((el) => revealObserver.observe(el));

// ===== 统计数字滚动 =====
const stats = document.querySelectorAll('.stat__num');
const statsObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseInt(el.dataset.target, 10);
            const duration = 1400;
            const start = performance.now();
            function tick(now) {
                const p = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = Math.round(target * eased).toString();
                if (p < 1) requestAnimationFrame(tick);
                else el.textContent = String(target);
            }
            requestAnimationFrame(tick);
            statsObserver.unobserve(el);
        });
    },
    { threshold: 0.5 }
);
stats.forEach((el) => statsObserver.observe(el));

// ===== 页脚年份 =====
document.getElementById('year').textContent = String(new Date().getFullYear());
