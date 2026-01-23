const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";
const endpoint = "https://accounts.fly4all.com/api/finance/buyers";
const token = "1cdtzai1n5ksohsq83rogqb56970de4f7e55ed8767115";

async function probe(page) {
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
                    "pagination[pageSize]": 10
                },
                body: {}
            })
        });
        const result = await response.json();
        if (result.ok) {
            return result.data?.data?.length || 0;
        } else {
            console.log(`Page ${page} Error: ${result.error}`);
            return -1;
        }
    } catch (err) { return -2; }
}

async function run() {
    console.log("Deep Probe around Page 460 (4600 items)...");
    const pages = [459, 460, 461, 462, 500, 600, 1000];
    for (const p of pages) {
        const count = await probe(p);
        console.log(`Page ${p} returned ${count} items`);
    }
}

run();
