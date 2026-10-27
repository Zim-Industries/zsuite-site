/* Progressive enhancement only: all content remains readable without JavaScript. */
(() => {
  const button = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#site-nav');
  if (!button || !navigation) return;
  document.documentElement.classList.add('js');
  button.hidden = false;
  const closeMenu = () => {
    button.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  };
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    navigation.classList.toggle('is-open', !expanded);
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      button.focus();
    }
  });
  window.matchMedia('(min-width: 851px)').addEventListener('change', closeMenu);

  document.querySelectorAll('[data-tabs]').forEach(group => {
    const list = group.querySelector('.workflow-options');
    const tabs = Array.from(group.querySelectorAll('.workflow-choice'));
    const panels = tabs.map(tab => document.getElementById(tab.hash.slice(1)));
    if (!list || panels.some(panel => !panel)) return;
    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-orientation', 'vertical');
    tabs.forEach((tab, index) => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panels[index].id);
      panels[index].setAttribute('role', 'tabpanel');
      panels[index].setAttribute('aria-labelledby', tab.id);
      panels[index].tabIndex = 0;
    });
    const select = (index, focus = false) => {
      tabs.forEach((tab, i) => {
        tab.setAttribute('aria-selected', String(i === index));
        tab.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
      if (focus) tabs[index].focus();
    };
    select(Math.max(0, panels.findIndex(panel => '#' + panel.id === window.location.hash)));
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', event => { event.preventDefault(); select(index); });
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (event.key === ' ') next = index;
        if (next !== undefined) { event.preventDefault(); select(next, true); }
      });
    });
  });
})();
