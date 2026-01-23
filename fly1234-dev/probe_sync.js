const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";
const endpoint = "https://accounts.fly4all.com/api/finance/buyers";
const token = "1cdtzai1n5ksohsq83rogqb56970de4f7e55ed8767115";

async function probeBatch(startPage, count) {
    console.log(`\n--- Probing Pages ${startPage} to ${startPage + count - 1} ---`);
    for (let i = 0; i < count; i++) {
        const page = startPage + i;
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
                        "pagination[pageSize]": 100,
                        "sort": "id:asc"
                    },
                    body: {}
                })
            });
            const result = await response.json();
            if (result.ok) {
                const items = result.data?.data || [];
                const total = result.data?.total || 0;
                process.stdout.write(`Page ${page}: ${items.length} items (Total: ${total}) | `);
                if (items.length === 0) {
                    console.log("\n[STOP] Reached empty page.");
                    return false;
                }
            } else {
                console.error(`\n[ERROR] Page ${page}:`, result.error);
                return false;
            }
        } catch (err) {
            console.error(`\n[EXCEPTION] Page ${page}:`, err.message);
            return false;
        }
    }
    return true;
}

async function run() {
    console.log("Starting Mass Sync Probe...");
    // Check start
    await probeBatch(1, 5);
    // Check 4600 mark (Page 46 if size 100)
    await probeBatch(44, 10);
}

run();
