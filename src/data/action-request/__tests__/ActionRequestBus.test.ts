import { actionRequestBus } from "../runtime/ActionRequestBus";

test("resolves request", async () => {
    actionRequestBus.setHandler((req, resolve) => {
        resolve({ status: "success", data: 123 });
    });

    const res = await actionRequestBus.request({
        requestId: "1",
        actionId: "test",
        container: "modal"
    });

    expect(res.status).toBe("success");
    expect(res.data).toBe(123);
});
