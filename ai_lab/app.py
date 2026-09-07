"""
Flask 后端:提供 AI 实验室的训练 / 对话 / 调试 API。
启动:python3 app.py  (默认监听 0.0.0.0:8000)
"""

import os
import threading
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from trainer import Trainer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')

app = Flask(__name__, static_folder=STATIC_DIR, static_url_path='')
CORS(app)

trainer = Trainer()

# 启动时加载语料,如果有保存的权重就加载
_init_lock = threading.Lock()


def ensure_initialized():
    with _init_lock:
        if trainer.data is None:
            trainer.load_corpus()
            # 尝试加载已有权重(若维度匹配)
            if os.path.exists(trainer.model_path):
                try:
                    # 先临时建一个同结构的模型来加载
                    from rnn_model import CharRNN
                    tmp = CharRNN(hidden_size=trainer.model.hidden_size)
                    tmp.set_vocab(trainer.model.vocab)
                    tmp.load(trainer.model_path)
                    if tmp.vocab == trainer.model.vocab:
                        trainer.model = tmp
                        trainer.last_message = '已加载上次保存的权重'
                except Exception as e:
                    print(f'[warn] 加载权重失败: {e}')


@app.route('/')
def index():
    return send_from_directory(STATIC_DIR, 'index.html')


@app.route('/api/status')
def api_status():
    return jsonify(trainer.get_status())


@app.route('/api/train', methods=['POST'])
def api_train():
    ensure_initialized()
    data = request.get_json(force=True) or {}
    ok, msg = trainer.start(
        n_iter=int(data.get('n_iter', 1000)),
        hidden_size=int(data.get('hidden_size')) if data.get('hidden_size') else None,
        lr=float(data.get('lr')) if data.get('lr') else None,
        seq_len=int(data.get('seq_len')) if data.get('seq_len') else None,
        corpus_text=data.get('corpus_text'),
        log_every=int(data.get('log_every', 20)),
    )
    return jsonify({'ok': ok, 'msg': msg, 'status': trainer.get_status()})


@app.route('/api/stop', methods=['POST'])
def api_stop():
    ok, msg = trainer.stop()
    return jsonify({'ok': ok, 'msg': msg})


@app.route('/api/chat', methods=['POST'])
def api_chat():
    """对话接口:把用户输入包成 '问:xxx\n答:' 喂给模型续写"""
    ensure_initialized()
    data = request.get_json(force=True) or {}
    user_input = (data.get('text') or '').strip()
    length = int(data.get('length', 120))
    temperature = float(data.get('temperature', 0.8))
    top_k = int(data.get('top_k', 5))
    raw_mode = bool(data.get('raw_mode', False))

    if not user_input:
        return jsonify({'ok': False, 'msg': '输入不能为空'})

    # 直接续写模式
    if raw_mode:
        seed = user_input
        out = trainer.model.sample(seed_text=seed, length=length,
                                   temperature=temperature, top_k=top_k)
        return jsonify({'ok': True, 'reply': out, 'raw': True})

    # 对话模式:把最近几轮对话拼进种子,带上下文续写 "答:"
    seed = trainer.build_seed(user_input)
    out = trainer.model.sample(seed_text=seed, length=length,
                               temperature=temperature, top_k=top_k)
    # 聪明的停止:遇到下一个"问:"或两个连续换行就截断
    cut = out.find('问:')
    if cut != -1:
        out = out[:cut]
    # 双换行也截断(语料里问答间通常有换行)
    for sep in ['\n\n', '\r\n\r\n']:
        idx = out.find(sep)
        if idx != -1 and idx < len(out):
            out = out[:idx]
    out = out.rstrip('\n').strip()
    if not out:
        out = '(模型还没学会回答,请先到「训练」页面训练它。)'
    # 记录这轮对话(供下一轮上下文)
    trainer.add_dialog(user_input, out)
    return jsonify({'ok': True, 'reply': out, 'raw': False, 'context_used': len(trainer.dialog_history) - 1})


@app.route('/api/sample', methods=['POST'])
def api_sample():
    ensure_initialized()
    data = request.get_json(force=True) or {}
    seed = data.get('seed', '')
    length = int(data.get('length', 200))
    temperature = float(data.get('temperature', 0.9))
    top_k = int(data.get('top_k', 0))
    out = trainer.model.sample(seed_text=seed, length=length,
                               temperature=temperature, top_k=top_k)
    return jsonify({'ok': True, 'text': out})


@app.route('/api/chat/clear', methods=['POST'])
def api_chat_clear():
    """清空后端对话上下文(下一轮对话变成冷启动)"""
    trainer.clear_dialog()
    return jsonify({'ok': True, 'msg': '对话上下文已清空'})


@app.route('/api/corpus', methods=['GET', 'POST'])
def api_corpus():
    ensure_initialized()
    if request.method == 'GET':
        return jsonify({'ok': True, 'corpus': trainer.corpus_text,
                        'vocab': trainer.model.vocab,
                        'vocab_size': trainer.model.vocab_size})
    data = request.get_json(force=True) or {}
    text = data.get('text', '')
    if not text.strip():
        return jsonify({'ok': False, 'msg': '语料不能为空'})
    # 保存到文件 + 重建词汇表
    with open(trainer.corpus_path, 'w', encoding='utf-8') as f:
        f.write(text)
    n, v = trainer.load_corpus(text)
    return jsonify({'ok': True, 'msg': f'语料已更新:共 {n} 字符,词汇表 {v} 个',
                    'corpus_len': n, 'vocab_size': v})


@app.route('/api/model')
def api_model():
    ensure_initialized()
    info = trainer.model.model_info()
    return jsonify({'ok': True, 'model': info})


@app.route('/api/debug/forward', methods=['POST'])
def api_debug_forward():
    """单步前向:输入一个字符 + 上一步隐藏状态,返回概率分布 + 新隐藏状态"""
    ensure_initialized()
    data = request.get_json(force=True) or {}
    ch = data.get('char', '')
    h_prev_list = data.get('h_prev')  # list of floats, 长度=hidden_size
    if not ch:
        return jsonify({'ok': False, 'msg': '请输入一个字符'})
    H = trainer.model.hidden_size
    if h_prev_list is None:
        h_prev = np.zeros((H, 1))
    else:
        h_prev = np.array(h_prev_list, dtype=np.float64).reshape((H, 1))
    probs, h_new = trainer.model.forward_single(ch, h_prev)
    if probs is None:
        return jsonify({'ok': False, 'msg': f'字符 "{ch}" 不在词汇表中'})
    # 取 top-10 概率
    top_idx = np.argsort(probs)[::-1][:10]
    top = [{'char': trainer.model.idx_to_char[i],
            'prob': float(probs[i])} for i in top_idx]
    return jsonify({
        'ok': True,
        'input_char': ch,
        'top': top,
        'h_new': h_new.flatten().tolist(),
    })


@app.route('/api/debug/weights')
def api_debug_weights():
    """返回部分权重用于可视化"""
    ensure_initialized()
    if trainer.model.params is None:
        return jsonify({'ok': False, 'msg': '模型未初始化'})
    p = trainer.model.params
    # 截取 W_hh 的前 16x16 用来热力图展示
    whh = p['W_hh'][:16, :16].tolist()
    return jsonify({
        'ok': True,
        'W_hh_preview': whh,
        'W_hh_shape': list(p['W_hh'].shape),
        'param_stats': {k: {
            'mean': float(np.mean(v)),
            'std': float(np.std(v)),
            'min': float(np.min(v)),
            'max': float(np.max(v)),
        } for k, v in p.items()}
    })


@app.route('/api/reset', methods=['POST'])
def api_reset():
    """重置模型权重(随机初始化)"""
    ensure_initialized()
    from rnn_model import CharRNN
    trainer.model = CharRNN(hidden_size=trainer.model.hidden_size,
                            learning_rate=trainer.model.lr,
                            seq_len=trainer.model.seq_len)
    trainer.model.set_vocab(trainer.corpus_text and sorted(set(trainer.corpus_text)))
    trainer.current_iter = 0
    trainer.loss_history = []
    trainer.status = 'idle'
    trainer.last_message = '模型权重已重置(随机初始化)'
    return jsonify({'ok': True, 'msg': trainer.last_message,
                    'status': trainer.get_status()})


@app.route('/health')
def health():
    return jsonify({'ok': True})


if __name__ == '__main__':
    ensure_initialized()
    app.run(host='0.0.0.0', port=8000, threaded=True)
