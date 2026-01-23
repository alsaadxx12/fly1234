const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";
const endpoint = "https://accounts.fly4all.com/api/finance/buyers";
const token = "1cdtzai1n5ksohsq83rogqb56970de4f7e55ed8767115";

async function probeFilter(params) {
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
            const items = result.data?.data || [];
            console.log(`Params ${JSON.stringify(params)} -> Returned ${items.length} items. First ID: ${items[0]?.id}`);
            return items;
        } else {
            console.log(`Params ${JSON.stringify(params)} -> Error: ${result.error}`);
        }
    } catch (err) { }
    return null;
}

async function run() {
    console.log("Testing ID-based filtering...");
    // 1. Get first page to find an ID
    const firstPage = await probeFilter({ "pagination[page]": 1, "pagination[pageSize]": 10 });
    if (firstPage && firstPage.length > 0) {
        const lastId = firstPage[firstPage.length - 1].id;
        console.log(`Last ID on Page 1: ${lastId}`);

        // 2. Try id_gt
        await probeFilter({ "filters[id][gt]": lastId, "pagination[pageSize]": 10 });
        // 3. Try id:gt
        await probeFilter({ "filters[id][$gt]": lastId, "pagination[pageSize]": 10 });
        // 4. Try legacy gt
        await probeFilter({ "id_gt": lastId, "pagination[pageSize]": 10 });
    }
}

run();
