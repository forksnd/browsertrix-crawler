/* eslint-disable @typescript-eslint/no-unused-vars */
class TestBehavior2 {
  static init() {
    return {
      state: {},
    };
  }

  static get id() {
    return "TestBehavior2";
  }

  static isMatch() {
    return window.location.origin === "https://old.webrecorder.net";
  }

  async *run(ctx) {
    ctx.log("In Test Behavior 2!");
    yield ctx.Lib.getState(ctx, "test-stat-2");
  }
}
