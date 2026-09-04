// dsh-quadrant-board — client half (DSH web GUI).
// Registers a "时间管理" tab in the conversation view tab bar (the same slot
// dsh-mnemon 记忆系统 and deepseek-idesign use). The tab body is a same-origin
// iframe served by this plugin's host half at /taskboard/.
window.__ModuleLoader__.load({
  id: "dsh-quadrant-board",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");
    // 不用 react/jsx-runtime：jsx(type, props, third) 的第三参是 key 而非
    // children，误用会静默丢掉 iframe（标签页空白的根因）。

    var shellStyle = {
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      minHeight: 0,
      background: "var(--color-background, #f6f7f9)"
    };
    var frameStyle = {
      flex: 1,
      width: "100%",
      minHeight: 0,
      border: 0,
      background: "#f6f7f9"
    };

    function guiIsDark() {
      try { return document.body.hasAttribute("data-dsh-dark-theme"); }
      catch (e) { return false; }
    }

    function BoardView() {
      // 主题跟随 GUI 当前明暗（看板内部仍可自行切换）。
      var src = "/taskboard/?embed=1" + (guiIsDark() ? "&theme=dark" : "&theme=light");
      return React.createElement(
        "section",
        { style: shellStyle, "aria-label": "时间管理" },
        React.createElement("iframe", {
          title: "时间管理",
          src: src,
          style: frameStyle
          // 不加 sandbox：内容是本插件自己服务的同源页面，且看板依赖
          // HTML5 拖拽（磁贴换位/任务卡跨象限）；Chromium 会限制沙箱
          // iframe 内发起原生拖拽，实测导致布局面板无法拖动。
        })
      );
    }

    function apply(ctx) {
      ctx.slots.inject("conversation.view", function () {
        return ctx.slots.register({
          name: "conversation.view",
          id: "dsh-quadrant-board",
          order: 25,
          label: "时间管理"
        }, BoardView);
      });
    }

    module.exports = { apply: apply, inject: ["slots"] };
    return module.exports;
  }
});
