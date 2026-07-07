const HELP_ITEMS = [
  {
    icon: '▲',
    title: '매수',
    text: '선택한 종목이 오를 것 같을 때. 수익 기회가 크지만 위험도도 오른다.',
  },
  {
    icon: '▼',
    title: '매도',
    text: '선택한 종목이 약해질 것 같을 때. 하락 대응이지만 반등 뉴스에서는 손해가 난다.',
  },
  {
    icon: '◆',
    title: '헤지',
    text: '방향은 애매하고 변동성이 클 때. 큰 수익보다 위험과 신뢰 방어가 목적이다.',
  },
  {
    icon: '●',
    title: '현금',
    text: '출처가 불확실하거나 과열이 의심될 때. 기회는 놓칠 수 있지만 루머에는 강하다.',
  },
];

function helpItemMarkup(item) {
  return `
    <article class="mp-help-item">
      <strong><span>${item.icon}</span>${item.title}</strong>
      <p>${item.text}</p>
    </article>
  `;
}

export function openHelpOverlay(domUi) {
  const root = domUi?.root;
  if (!root || root.querySelector('.mp-help-modal')) return;

  const modal = document.createElement('div');
  modal.className = 'mp-help-modal';
  modal.innerHTML = `
    <div class="mp-modal-backdrop mp-help-backdrop" data-layout-id="help-backdrop"></div>
    <section class="mp-help-card" data-layout-id="help-panel" role="dialog" aria-modal="true" aria-labelledby="mp-help-title">
      <h2 id="mp-help-title" data-layout-id="help-title">도움말</h2>
      <p class="mp-help-intro" data-layout-id="help-intro">뉴스 종목 카드를 먼저 고르고, 뉴스당 한 번만 행동하세요.</p>
      <div class="mp-help-items" data-layout-id="help-items">
        ${HELP_ITEMS.map(helpItemMarkup).join('')}
      </div>
      <button class="mp-menu-button mp-help-close" data-layout-id="help-close" type="button">확인</button>
    </section>
  `;

  const close = () => {
    modal.remove();
    domUi.publishLayout?.();
  };

  modal.querySelector('.mp-help-backdrop')?.addEventListener('click', close);
  modal.querySelector('.mp-help-close')?.addEventListener('click', (event) => {
    event.preventDefault();
    close();
  });
  root.appendChild(modal);
  domUi.publishLayout?.();
}
