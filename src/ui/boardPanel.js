import { renderProjectListHtml } from '../lib/projectHtml.js';

/**
 * The project board overlay. `container` must already exist in the page and
 * contain an element with class "panel-body" and a button with class "panel-close".
 */
export function createBoardPanel(container, projects) {
  const body = container.querySelector('.panel-body');
  const closeBtn = container.querySelector('.panel-close');
  body.innerHTML = renderProjectListHtml(projects);

  let returnFocusTo = null;

  function open() {
    returnFocusTo = document.activeElement;
    container.hidden = false;
    closeBtn.focus();
  }

  function close() {
    container.hidden = true;
    if (returnFocusTo && typeof returnFocusTo.focus === 'function') returnFocusTo.focus();
    returnFocusTo = null;
  }

  function isOpen() {
    return !container.hidden;
  }

  closeBtn.addEventListener('click', close);

  return { open, close, isOpen };
}
