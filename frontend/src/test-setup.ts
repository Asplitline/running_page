// 测试环境补齐 jsdom 缺失的浏览器 API。
//
// jsdom 不实现 ResizeObserver，而按容器宽度自适应的组件(如热力日历)必须用它。
// 这里给的是最小可用实现：只保证构造与订阅不抛错，不模拟真实尺寸变化 ——
// 测试关心的是"渲染不崩"和初始布局，尺寸响应属于浏览器行为，单测覆盖不了。
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub;
}
