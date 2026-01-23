const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";
const endpoint = "https://accounts.fly4all.com/api/finance/buyers";
const token = "1cdtzai1n5ksohsq83rogqb56970de4f7e55ed8767115";

async function probeStart(params) {
    try {
        const response = await fetch(FN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                endpoint,
                token,
                method: "POST",
                params,
                body: {}
            })
        });
        const result = await response.json();
        if (result.ok) {
            const data = result.data;
            const items = data.data || [];
            console.log(`Params ${JSON.stringify(params)} -> Items: ${items.length}, Total: ${data.total}`);
            return items;
        }
    } catch (err) { }
    return null;
}

async function run() {
    console.log("Testing offset-based pagination...");
    // 1. Standard page 1
    await probeStart({ "pagination[page]": 1, "pagination[pageSize]": 10 });
    // 2. Start 10 (should be page 2)
    await probeStart({ "pagination[start]": 10, "pagination[limit]": 10 });
    // 3. Start 4600 (beyond the barrier)
    await probeStart({ "pagination[start]": 4600, "pagination[limit]": 10 });
    // 4. Try limit 100
    await probeStart({ "pagination[start]": 0, "pagination[limit]": 100 });
}

run();
