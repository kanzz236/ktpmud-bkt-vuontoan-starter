/* Thành phần giao diện cho câu hỏi type='estimate' (Track B: "Ước lượng trước khi tính đúng").
 *
 * Được trang làm bài chung lesson.html (lesson.js) gọi khi gặp câu 'estimate'.
 * - Bước 1: nhập ước lượng (một số hoặc một khoảng) rồi "Chốt ước lượng" -> server chấm, KHÔNG lộ đáp án.
 * - Bước 2: chỉ mở khóa sau bước 1; nộp kết quả tính chính xác -> server lộ đáp án + lời giải ước lượng mẫu.
 * - Mọi chấm điểm/kiểm tra nằm ở server; trang này chỉ hiển thị. Trạng thái khôi phục được sau F5.
 * - Bàn phím (B-12): Tab/Shift+Tab đi qua các ô, Enter gửi biểu mẫu, mũi tên chọn "một số/một khoảng",
 *   sau bước 1 focus tự chuyển tới ô bước 2. Lỗi hiển thị bằng role="alert", phản hồi bằng aria-live.
 * - Văn bản động luôn gán bằng textContent (không chèn HTML từ dữ liệu).
 */
(function () {
  function h(tag, props, children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (v === true) node.setAttribute(k, '');
      else if (v !== false && v != null) node.setAttribute(k, v);
    });
    (children || []).forEach(c => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  }

  function mount(root, q, index, initial, hooks) {
    const p = `eq${index}`;
    root.className = 'est-card';
    root.setAttribute('aria-labelledby', `${p}-title`);
    root.textContent = '';

    root.appendChild(h('p', { class: 'est-meta', text: `Câu ${index + 1} • ${q.points} điểm • Ước lượng trước khi tính đúng` }));
    root.appendChild(h('h3', { id: `${p}-title`, class: 'est-title', text: q.prompt }));

    /* ---- Bước 1 ---- */
    const estInput = h('input', { id: `${p}-est`, class: 'est-input', type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-describedby': `${p}-err1` });
    const lowInput = h('input', { id: `${p}-low`, class: 'est-input', type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-describedby': `${p}-err1` });
    const highInput = h('input', { id: `${p}-high`, class: 'est-input', type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-describedby': `${p}-err1` });
    const radioValue = h('input', { type: 'radio', name: `${p}-mode`, value: 'value', id: `${p}-m1`, checked: true });
    const radioRange = h('input', { type: 'radio', name: `${p}-mode`, value: 'range', id: `${p}-m2` });
    const valueRow = h('div', { class: 'est-row' }, [h('label', { for: `${p}-est`, text: 'Con đoán kết quả khoảng bao nhiêu?' }), estInput]);
    const rangeRow = h('div', { class: 'est-row est-hidden' }, [
      h('label', { for: `${p}-low`, text: 'Kết quả nằm trong khoảng từ' }), lowInput,
      h('label', { for: `${p}-high`, text: 'đến' }), highInput]);
    const btnEstimate = h('button', { type: 'submit', class: 'est-btn', text: 'Chốt ước lượng' });
    const err1 = h('p', { id: `${p}-err1`, class: 'est-error', role: 'alert' });
    const fb1 = h('p', { class: 'est-feedback', 'aria-live': 'polite' });
    const form1 = h('form', { novalidate: true, 'aria-labelledby': `${p}-s1` }, [
      h('fieldset', { class: 'est-fieldset' }, [
        h('legend', { text: 'Con muốn ước lượng bằng:' }),
        h('label', { class: 'est-radio', for: `${p}-m1` }, [radioValue, ' một số']),
        h('label', { class: 'est-radio', for: `${p}-m2` }, [radioRange, ' một khoảng'])]),
      valueRow, rangeRow, btnEstimate, err1, fb1]);
    root.appendChild(h('section', { class: 'est-step' }, [
      h('h4', { id: `${p}-s1`, text: 'Bước 1 · Ước lượng trước (chưa cần tính đúng)' }),
      h('p', { class: 'est-tip', text: 'Mẹo: làm tròn số có nhiều chữ số đến hàng chục hoặc hàng trăm rồi tính nhẩm. Chốt xong sẽ không sửa được nữa.' }),
      form1]));

    /* ---- Bước 2 ---- */
    const exactInput = h('input', { id: `${p}-exact`, class: 'est-input', type: 'text', inputmode: 'numeric', autocomplete: 'off', disabled: true, 'aria-describedby': `${p}-err2` });
    const btnExact = h('button', { type: 'submit', class: 'est-btn est-btn-2', text: 'Kiểm tra kết quả', disabled: true });
    const err2 = h('p', { id: `${p}-err2`, class: 'est-error', role: 'alert' });
    const lockNote = h('p', { class: 'est-tip', text: 'Con cần chốt ước lượng ở bước 1 trước thì mới mở được bước này.' });
    const reveal = h('div', { class: 'est-reveal est-hidden', 'aria-live': 'polite' });
    const form2 = h('form', { novalidate: true, 'aria-labelledby': `${p}-s2` }, [
      h('div', { class: 'est-row' }, [h('label', { for: `${p}-exact`, text: 'Kết quả tính chính xác là:' }), exactInput]),
      btnExact, err2]);
    root.appendChild(h('section', { class: 'est-step' }, [
      h('h4', { id: `${p}-s2`, text: 'Bước 2 · Tính chính xác' }), lockNote, form2, reveal]));

    /* ---- Hành vi ---- */
    const mode = () => (radioRange.checked ? 'range' : 'value');
    function syncMode() {
      valueRow.classList.toggle('est-hidden', mode() !== 'value');
      rangeRow.classList.toggle('est-hidden', mode() !== 'range');
    }
    radioValue.addEventListener('change', syncMode);
    radioRange.addEventListener('change', syncMode);

    function showError(node, msg) { node.textContent = msg || ''; }
    function describeEst(est) { return est.mode === 'range' ? `khoảng từ ${est.low} đến ${est.high}` : String(est.value); }

    function lockStep1(est, reasonable, feedback) {
      [estInput, lowInput, highInput, radioValue, radioRange, btnEstimate].forEach(n => { n.disabled = true; });
      if (est.mode === 'range') { radioRange.checked = true; lowInput.value = est.low; highInput.value = est.high; }
      else { radioValue.checked = true; estInput.value = est.value; }
      syncMode();
      showError(err1, '');
      fb1.textContent = `${reasonable ? '✔' : '✖'} ${feedback}`;
      fb1.className = 'est-feedback ' + (reasonable ? 'est-ok' : 'est-bad');
    }
    function unlockStep2() {
      exactInput.disabled = false; btnExact.disabled = false; lockNote.classList.add('est-hidden');
    }
    function showReveal(r) {
      [exactInput, btnExact].forEach(n => { n.disabled = true; });
      lockNote.classList.add('est-hidden');
      exactInput.value = r.exact.given;
      showError(err2, '');
      reveal.textContent = '';
      reveal.classList.remove('est-hidden');
      // Thông báo của server đã tự nêu rõ "ước lượng ..." hay "kết quả tính chính xác ..." — chỉ thêm biểu tượng ✔/✖ (không chỉ dựa vào màu).
      const line = (ok, text) => h('p', { class: ok ? 'est-ok' : 'est-bad', text: `${ok ? '✔' : '✖'} ${text}` });
      reveal.appendChild(line(r.estimate.reasonable, r.estimate.message));
      reveal.appendChild(line(r.exact.correct, r.exact.message));
      const cmp = r.comparison;
      const range = cmp.acceptedRange ? ` • Khoảng ước lượng được chấp nhận: ${cmp.acceptedRange.lower} – ${cmp.acceptedRange.upper}` : '';
      reveal.appendChild(h('p', { class: 'est-compare', text: `Ước lượng của con: ${describeEst(cmp.estimate)} • Kết quả chính xác: ${cmp.exactResult}${range}` }));
      reveal.appendChild(h('p', { class: 'est-tip', text: r.teaching }));
      if (hooks && hooks.onDone) hooks.onDone(q.id, String(r.exact.given));
    }

    form1.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      showError(err1, '');
      const body = { questionId: q.id };
      if (mode() === 'range') {
        if (!lowInput.value.trim() || !highInput.value.trim()) { showError(err1, 'Con nhập cả số "từ" và số "đến" nhé!'); (lowInput.value.trim() ? highInput : lowInput).focus(); return; }
        body.low = lowInput.value.trim(); body.high = highInput.value.trim();
      } else {
        if (!estInput.value.trim()) { showError(err1, 'Con chưa nhập ước lượng. Hãy điền một số nhé!'); estInput.focus(); return; }
        body.estimate = estInput.value.trim();
      }
      btnEstimate.disabled = true;
      try {
        const r = await window.MathAPI.post('/api/estimation/estimate', body);
        lockStep1(r.estimate, r.reasonable, r.feedback);
        unlockStep2();
        exactInput.focus();
      } catch (e) {
        showError(err1, e.message);
        btnEstimate.disabled = false;
      }
    });

    form2.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      showError(err2, '');
      if (!exactInput.value.trim()) { showError(err2, 'Con chưa nhập kết quả. Hãy tính rồi điền một số nhé!'); exactInput.focus(); return; }
      btnExact.disabled = true;
      try {
        const r = await window.MathAPI.post('/api/estimation/exact', { questionId: q.id, exact: exactInput.value.trim() });
        showReveal(r);
        reveal.setAttribute('tabindex', '-1');
        reveal.focus();
      } catch (e) {
        showError(err2, e.message);
        btnExact.disabled = false;
      }
    });

    /* ---- Khôi phục trạng thái đã lưu trên server (sau F5) ---- */
    if (initial && initial.stage === 'exact') {
      lockStep1(initial.estimate, initial.reasonable, initial.feedback);
      unlockStep2();
    } else if (initial && initial.stage === 'done') {
      lockStep1(initial.estimate, initial.estimate.reasonable, initial.estimate.message);
      showReveal(initial);
    }
  }

  window.EstimateUI = { mount };
})();
