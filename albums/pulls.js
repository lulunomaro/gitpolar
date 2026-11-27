import { $, el, icon, button, media, empty, request, sizeText } from './ui.js';

const labels = { open: '待审核', merged: '已合并', closed: '已关闭' };
const stateBadge = (state) => el('span', 'pr-state ' + state, labels[state]);
const localDay = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
// getRandomValues also works on an HTTP LAN origin.
const requestKey = () =>
  [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
const marks = (mark) => [`${mark.rating} 星`, ...mark.tags].join(' · ');
function uploadFile(url, file, progress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.responseType = 'json';
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        progress(e.loaded === e.total ? '生成预览…' : `${Math.round((e.loaded / e.total) * 100)}%`);
    };
    xhr.onload = () =>
      xhr.status === 201
        ? resolve(xhr.response)
        : reject(new Error(xhr.response?.error || `上传失败（${xhr.status}）`));
    xhr.onerror = () => reject(new Error('连接中断，请重试。'));
    xhr.send(file);
  });
}
export function setupPulls({ api, getRepo, getActivity, afterChange }) {
  const endpoint = api + '/pulls',
    compose = $('compose'),
    review = $('review'),
    form = $('proposal-form');
  let queue = [],
    editing = null,
    expected = '',
    busy = false,
    previousPayload = '',
    key = '',
    reviewToken = 0,
    deciding = false,
    tab = 'open';
  const notify = (message, isError = false) => {
    const s = $('compose-status');
    s.textContent = message;
    s.classList.toggle('error', isError);
  };
  function release() {
    for (const row of queue) URL.revokeObjectURL(row.url);
    queue = [];
  }
  compose.addEventListener('cancel', (e) => {
    if (busy) e.preventDefault();
  });
  compose.addEventListener('close', release);
  review.addEventListener('cancel', (e) => {
    if (deciding) e.preventDefault();
  });
  review.addEventListener('close', () => {
    reviewToken++;
    $('review-content').replaceChildren();
  });
  function drawQueue() {
    const nodes = queue.map((row, i) => {
      const item = el('div', 'queue-row'),
        name = el('strong', '', row.file.name);
      name.title = row.file.name;
      const state = el('small', '', row.status || sizeText(row.file.size));
      const remove = button(
        '',
        () => {
          queue.splice(i, 1);
          URL.revokeObjectURL(row.url);
          drawQueue();
        },
        'tool',
        'close'
      );
      remove.ariaLabel = '移除 ' + row.file.name;
      remove.disabled = busy;
      item.append(media(row.url, ''), name, state, remove);
      row.label = state;
      return item;
    });
    $('queue').replaceChildren(...nodes);
  }
  function addFiles(files) {
    if (busy) return;
    const errors = [];
    for (const file of files) {
      if (!/\.(?:jpe?g|png|webp|gif)$/i.test(file.name) || file.size > 64 * 1024 ** 2 || !file.size) {
        errors.push(file.name + '：格式或大小不符');
        continue;
      }
      if (queue.some((q) => q.file.name.toLowerCase() === file.name.toLowerCase())) {
        errors.push(file.name + '：同一次投稿已有同名文件');
        continue;
      }
      if (queue.length >= 200) {
        errors.push('一次最多投稿 200 张');
        break;
      }
      queue.push({ file, url: URL.createObjectURL(file), id: '', status: '' });
    }
    notify(errors.slice(0, 3).join('；'), errors.length > 0);
    drawQueue();
  }
  function activityFields() {
    const isNew = !editing && $('target-activity').value === 'new';
    $('new-fields').hidden = !isNew;
    for (const id of ['activity-name', 'activity-date']) {
      $(id).required = isNew;
      $(id).disabled = !isNew || busy;
    }
  }
  function begin(edits, summary, files) {
    if (compose.open || !getRepo() || getRepo().ref !== 'main') return;
    release();
    form.reset();
    editing = edits;
    expected = getRepo().oid;
    previousPayload = '';
    key = '';
    notify('');
    $('compose-title').textContent = edits ? '提交整理 PR' : '照片投稿';
    $('upload-fields').hidden = !!edits;
    $('target-activity').disabled = !!edits;
    $('edit-summary').hidden = !edits;
    $('edit-summary').textContent = summary;
    const activities = [...getRepo().albums].sort(
      (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN')
    );
    $('target-activity').replaceChildren(
      new Option('新建活动…', 'new'),
      ...activities.map((a) => new Option(a.title + (a.date ? ' · ' + a.date : ''), a.id))
    );
    $('target-activity').value = getActivity() || 'new';
    $('activity-date').value = localDay();
    activityFields();
    if (edits) $('pr-title').value = `整理 ${edits.ids.length} 张照片的标注`;
    addFiles(files);
    compose.showModal();
    if (edits) $('pr-title').focus();
  }
  function upload(files = []) {
    begin(null, '', files);
  }
  function edit(edits, summary) {
    begin(edits, summary, []);
  }
  $('target-activity').onchange = activityFields;
  $('file-input').onchange = (e) => {
    addFiles([...e.target.files]);
    e.target.value = '';
  };
  const drop = $('drop');
  drop.ondragover = (e) => {
    e.preventDefault();
    drop.classList.add('drag');
  };
  drop.ondragleave = () => drop.classList.remove('drag');
  drop.ondrop = (e) => {
    e.preventDefault();
    drop.classList.remove('drag');
    addFiles([...e.dataTransfer.files]);
  };
  function lock(on) {
    busy = on;
    for (const node of form.querySelectorAll('input,button,textarea,select')) node.disabled = on;
    $('target-activity').disabled = on || !!editing;
    activityFields();
    drawQueue();
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (!editing && !queue.length) {
      notify('请先选择照片。', true);
      return;
    }
    const input = {
      title: $('pr-title').value.trim(),
      description: $('pr-description').value.trim(),
      expectedHead: expected,
    };
    if (!input.title) {
      notify('请填写投稿标题。', true);
      return;
    }
    if (editing) input.edits = editing;
    else if ($('target-activity').value === 'new') {
      input.activityName = $('activity-name').value.trim();
      input.date = $('activity-date').value;
    } else input.activityId = $('target-activity').value;
    lock(true);
    let created;
    try {
      if (!editing) {
        for (const [i, row] of queue.entries()) {
          if (row.id) continue;
          notify(`上传 ${i + 1} / ${queue.length}`);
          const progress = (value) => {
            row.status = value;
            row.label.textContent = value;
          };
          progress('上传中…');
          try {
            const uploaded = await uploadFile(
              endpoint + '/uploads?' + new URLSearchParams({ name: row.file.name }),
              row.file,
              progress
            );
            row.id = uploaded.id;
            progress('已就绪');
          } catch (err) {
            progress('待重试');
            throw err;
          }
        }
        input.uploads = queue.map((q) => q.id);
      }
      const fingerprint = JSON.stringify(input);
      if (fingerprint !== previousPayload) {
        previousPayload = fingerprint;
        key = requestKey();
      }
      notify('正在创建投稿分支…');
      created = await request(endpoint, { method: 'POST', body: { ...input, key } });
    } catch (err) {
      notify(err.message, true);
      if (err.status === 409 && /main/.test(err.message) && !editing) {
        try {
          expected = (await request(api + '?ref=main')).oid;
          notify('主相册已有更新，已读取新版本。请核对活动后再点提交。', true);
        } catch {
          /* Retain the server error. */
        }
      }
    } finally {
      lock(false);
    }
    if (created) {
      compose.close();
      await afterChange(false);
      showReview(created.number);
    }
  };
  function list(root, prs, searching) {
    root.replaceChildren();
    const tabs = el('div', 'state-tabs');
    for (const status of ['open', 'merged', 'closed']) {
      const count = prs.filter((p) => p.state === status).length;
      const item = button(
        `${labels[status]} ${count}`,
        () => {
          tab = status;
          list(root, prs, searching);
        },
        'filter'
      );
      item.setAttribute('aria-pressed', String(status === tab));
      tabs.append(item);
    }
    root.append(tabs);
    const entries = prs.filter((p) => p.state === tab);
    if (!entries.length) {
      const box = el('div');
      empty(box, 'pull', searching ? '没有匹配的投稿' : '暂无' + labels[tab] + '的投稿');
      root.append(box);
    }
    for (const p of entries) {
      const row = button('', () => showReview(p.number), 'pr-row', 'pull'),
        caption = el('span');
      caption.append(
        el('strong', '', p.title),
        el(
          'small',
          '',
          `#${p.number} · ${p.author} · ${p.createdAt.slice(0, 10)} · 新增 ${p.added} / 整理 ${p.edited}`
        )
      );
      row.append(caption, stateBadge(p.state));
      root.append(row);
    }
  }
  async function showReview(number) {
    const token = ++reviewToken;
    if (!review.open) review.showModal();
    $('review-title').textContent = `相册投稿 #${number}`;
    const root = $('review-content');
    root.textContent = '正在读取投稿…';
    try {
      const pr = await request(endpoint + '/' + number);
      if (token === reviewToken && review.open) renderReview(pr);
    } catch (err) {
      if (token === reviewToken && review.open)
        empty(
          root,
          'info',
          '无法读取投稿',
          err.message,
          button('重试', () => showReview(number))
        );
    }
  }
  function renderReview(pr) {
    const root = $('review-content');
    root.replaceChildren();
    $('review-title').textContent = `#${pr.number} ${pr.title}`;
    const state = el('div', 'state-line');
    state.append(
      stateBadge(pr.state),
      el('span', '', pr.author + ' · ' + pr.createdAt.slice(0, 10)),
      el('span', '', `新增 ${pr.added} · 整理 ${pr.edited}`)
    );
    root.append(state);
    if (pr.activity) root.append(el('p', 'muted', '活动 · ' + pr.activity));
    if (pr.description) root.append(el('p', 'note', pr.description));
    const group = el('div', 'section'),
      indexLabel = el('span', 'mono'),
      preview = el('div'),
      paging = el('div', 'review-paging');
    let index = 0;
    const prev = button(
        '上一张',
        () => {
          index--;
          photo();
        },
        'secondary',
        'left'
      ),
      next = button(
        '下一张',
        () => {
          index++;
          photo();
        },
        'secondary',
        'right'
      );
    paging.append(prev, indexLabel, next);
    group.append(paging, preview);
    root.append(group);
    function photo() {
      const p = pr.photos[index];
      if (!p) return;
      indexLabel.textContent = `${index + 1} / ${pr.photos.length}`;
      prev.disabled = index === 0;
      next.disabled = index + 1 === pr.photos.length;
      const img = media(p.previewUrl, p.name);
      img.className = 'review-image';
      preview.replaceChildren(img, el('strong', '', p.name), el('p', 'muted', p.path));
      if (p.type === 'edit') {
        const diff = el('div', 'changes');
        for (const [label, value] of [
          ['修改前', p.before],
          ['修改后', p.after],
        ]) {
          const side = el('div');
          side.append(el('strong', '', label), el('p', '', marks(value)));
          diff.append(side);
        }
        preview.append(diff);
      }
    }
    photo();
    if (pr.reviewer)
      root.append(
        el('p', 'section muted', `${pr.reviewer} · ${labels[pr.state]} · ${pr.reviewedAt?.slice(0, 10) || ''}`)
      );
    if (pr.reason) root.append(el('p', 'note', '关闭原因 · ' + pr.reason));
    if (!pr.canReview && !pr.canClose) return;
    const actions = el('div', 'review-actions'),
      status = el('p', 'feedback'),
      reasonLabel = el('label', 'section', '关闭或撤回原因（可选）'),
      reason = el('textarea');
    reason.maxLength = 1000;
    reason.rows = 2;
    reasonLabel.append(reason);
    reasonLabel.hidden = true;
    const decision = async (action) => {
      if (deciding) return;
      deciding = true;
      for (const b of actions.children) b.disabled = true;
      review.querySelector('[data-dismiss]').disabled = true;
      status.textContent = '正在保存…';
      let updated;
      try {
        updated = await request(`${endpoint}/${pr.number}/${action}`, {
          method: 'POST',
          body: { expectedHead: pr.head, reason: reason.value.trim() },
        });
      } catch (err) {
        status.textContent = err.message;
        status.classList.add('error');
      } finally {
        deciding = false;
        review.querySelector('[data-dismiss]').disabled = false;
        for (const b of actions.children) b.disabled = false;
      }
      if (updated) {
        tab = 'open';
        renderReview(updated);
        await afterChange(updated.state === 'merged');
      }
    };
    if (pr.canReview) actions.append(button('合并到 main', () => decision('merge'), 'primary', 'check'));
    if (pr.canClose) {
      const close = button(pr.canReview ? '关闭投稿' : '撤回投稿', () => {
        if (reasonLabel.hidden) {
          reasonLabel.hidden = false;
          reason.focus();
          close.textContent = pr.canReview ? '确认关闭' : '确认撤回';
        } else decision('close');
      });
      actions.append(close);
    }
    root.append(reasonLabel, actions, status);
  }
  return { upload, edit, list, showReview };
}
