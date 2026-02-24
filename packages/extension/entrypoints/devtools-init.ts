export default defineUnlistedScript(() => {
  browser.devtools.panels.create("Chrome2Code", "", "/devtools-panel/index.html");
});
