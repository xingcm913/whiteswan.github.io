"""
训练器:在后台线程中训练 CharRNN,记录损失曲线、可中断、可续训。
"""

import threading
import time
import numpy as np

from rnn_model import CharRNN


class Trainer:
    def __init__(self):
        self.model = CharRNN(hidden_size=128, learning_rate=0.001, seq_len=50)
        self.lock = threading.RLock()
        self._thread = None
        self._stop_flag = threading.Event()

        # 训练状态(供前端轮询)
        self.status = 'idle'  # idle / training / stopped / done
        self.config = {}
        self.loss_history = []     # [{iter, loss, smooth_loss, time}]
        self.current_iter = 0
        self.total_iter = 0
        self.last_message = ''

        self.corpus_text = ''
        self.data = None           # 字符索引数组
        self.model_path = '/workspace/ai_lab/model.pkl'
        self.corpus_path = '/workspace/ai_lab/corpus.txt'

        # 对话上下文(保留最近几轮,拼入种子,让回答更连贯)
        self.dialog_history = []   # [{q, a}, ...]
        self.max_history_rounds = 3

    # ---------------- 语料 ----------------
    def load_corpus(self, text=None):
        if text is None:
            with open(self.corpus_path, 'r', encoding='utf-8') as f:
                text = f.read()
        self.corpus_text = text
        # 构建词汇表
        chars = sorted(set(text))
        if not self.model.vocab or set(self.model.vocab) != set(chars):
            self.model.set_vocab(chars)
        self.data = np.array([self.model.char_to_idx[c] for c in text], dtype=np.int64)
        return len(text), len(chars)

    # ---------------- 训练主循环 ----------------
    def _train_loop(self, n_iter, log_every):
        n = len(self.data)
        seq_len = self.model.seq_len
        pos = 0
        h_prev = np.zeros((self.model.hidden_size, 1))
        last_save_iter = 0
        SAVE_EVERY = max(log_every * 5, 200)  # 中途降频保存,避免 IO 拖慢训练

        while not self._stop_flag.is_set() and self.current_iter < n_iter:
            # 到达结尾,回到开头并重置记忆(常规做法)
            if pos + seq_len + 1 >= n:
                pos = 0
                h_prev = np.zeros((self.model.hidden_size, 1))

            x_idx = self.data[pos:pos + seq_len]
            y_idx = self.data[pos + 1:pos + 1 + seq_len]

            loss, grads, h_prev = self.model.loss_and_grads(x_idx, y_idx, h_prev)

            # NaN / Inf 保护:学习率过大或梯度爆炸时自动停
            if not np.isfinite(loss):
                self.status = 'stopped'
                self.last_message = (f'训练在 iter={self.current_iter} 检测到 NaN/Inf 损失,'
                                     f'已自动停止。请把学习率调小(当前 lr={self.model.lr})后重置权重重训。')
                self.model.save(self.model_path)
                return

            h_prev = h_prev.copy()
            self.model.step(grads)

            self.model.smooth_loss = 0.999 * self.model.smooth_loss + 0.001 * loss if self.model.smooth_loss else loss

            self.current_iter += 1
            pos += seq_len

            if self.current_iter % log_every == 0 or self.current_iter == n_iter:
                self.loss_history.append({
                    'iter': self.current_iter,
                    'loss': float(loss),
                    'smooth_loss': float(self.model.smooth_loss),
                    'time': time.time(),
                })
                # 只保留最近 500 条
                if len(self.loss_history) > 500:
                    self.loss_history = self.loss_history[-500:]
                # 中途降频保存(只在每 SAVE_EVERY 步或最后一步)
                if self.current_iter - last_save_iter >= SAVE_EVERY or self.current_iter == n_iter:
                    self.model.save(self.model_path)
                    last_save_iter = self.current_iter

        if self._stop_flag.is_set():
            self.status = 'stopped'
            self.last_message = '用户停止训练,已保存当前权重'
        else:
            self.status = 'done'
            self.last_message = f'训练完成,共 {self.current_iter} 次迭代'
        self.model.save(self.model_path)

    # ---------------- 对话上下文 ----------------
    def add_dialog(self, q, a):
        self.dialog_history.append({'q': q, 'a': a})
        if len(self.dialog_history) > self.max_history_rounds:
            self.dialog_history = self.dialog_history[-self.max_history_rounds:]

    def clear_dialog(self):
        self.dialog_history = []

    def build_seed(self, user_input):
        """把最近几轮对话 + 当前问题拼成种子,带上下文续写"""
        parts = []
        for h in self.dialog_history:
            parts.append(f"问:{h['q']}\n答:{h['a']}")
        parts.append(f"问:{user_input}\n答:")
        return '\n'.join(parts)

    def start(self, n_iter=1000, hidden_size=None, lr=None, seq_len=None,
              log_every=20, corpus_text=None):
        with self.lock:
            if self.status == 'training':
                return False, '已在训练中,请先停止'
            self._stop_flag.clear()
            # 加载 / 重设语料
            if corpus_text is not None and corpus_text.strip():
                self.load_corpus(corpus_text)
            else:
                if self.data is None:
                    self.load_corpus()
            # 可选重设超参
            reset = False
            if hidden_size is not None and hidden_size != self.model.hidden_size:
                self.model = CharRNN(hidden_size=hidden_size,
                                     learning_rate=self.model.lr if lr is None else lr,
                                     seq_len=seq_len or self.model.seq_len)
                self.model.set_vocab(self.model.vocab)
                reset = True
            if lr is not None:
                self.model.lr = lr
            if seq_len is not None:
                self.model.seq_len = seq_len

            self.config = {
                'n_iter': n_iter,
                'hidden_size': self.model.hidden_size,
                'lr': self.model.lr,
                'seq_len': self.model.seq_len,
                'vocab_size': self.model.vocab_size,
                'corpus_len': len(self.data),
            }
            self.total_iter = n_iter
            self.current_iter = 0
            self.status = 'training'
            self.last_message = '训练已启动'

            self._thread = threading.Thread(
                target=self._train_loop, args=(n_iter, log_every), daemon=True
            )
            self._thread.start()
            return True, '训练已启动'

    def stop(self):
        if self.status != 'training':
            return False, '当前未在训练'
        self._stop_flag.set()
        return True, '已请求停止,稍候将完成当前批次并保存'

    # ---------------- 供 API 读取 ----------------
    def get_status(self):
        return {
            'status': self.status,
            'current_iter': self.current_iter,
            'total_iter': self.total_iter,
            'config': self.config,
            'loss_history': self.loss_history[-200:],
            'last_message': self.last_message,
            'model_info': self.model.model_info(),
        }
