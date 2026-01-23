const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";
const endpoint = "https://accounts.fly4all.com/api/finance/buyers";
const token = "1cdtzai1n5ksohsq83rogqb56970de4f7e55ed8767115";

async function probe(page) {
    console.log(`Probing page ${page}...`);
    try {
        const response = await fetch(FN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                endpoint,
                token,
                method: "POST",
                params: {
                    "pagination[page]": page,
                    "pagination[pageSize]": 100, // Testing pageSize vs perpage
                    "sort": "id:asc"
                },
                body: {}
            })
        });
        const result = await response.json();
        if (result.ok) {
            const items = result.data?.data || [];
            const total = result.data?.total || 0;
            console.log(`Page ${page}: Received ${items.length} items. Total reported: ${total}`);
            return items.length;
        } else {
            console.error(`Page ${page} Error:`, result.error);
        }
    } catch (err) {
        console.error(`Page ${page} Exception:`, err.message);
    }
    return 0;
}

async function run() {
    console.log("Starting API Probe...");
    await probe(1);
    await probe(46);
    await probe(47);
    await probe(48);
    await probe(100);
}

run();
