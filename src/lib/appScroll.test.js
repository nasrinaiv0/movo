import { appScrollTop, scrollAppTo } from './appScroll';

afterEach(() => { document.body.innerHTML = ''; jest.restoreAllMocks(); });

test('folded panes retain independent navigation scroll positions without moving the document', () => {
  const scroll = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  document.body.innerHTML = '<div class="movo-app layout-pane"><div class="app-shell"></div></div>';
  scrollAppTo(240);
  expect(appScrollTop()).toBe(240);
  expect(scroll).not.toHaveBeenCalled();
  scrollAppTo(0);
  expect(appScrollTop()).toBe(0);
});

test('ordinary phone and desktop windows keep document scrolling', () => {
  const scroll = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});
  scrollAppTo(180);
  expect(scroll).toHaveBeenCalledWith(0, 180);
  expect(appScrollTop()).toBe(window.scrollY);
});
