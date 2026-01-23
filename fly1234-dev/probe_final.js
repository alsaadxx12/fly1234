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
                    "pagination[pageSize]": 100, // Try pageSize
                    "pagination[pageSize]": 100,
                    "sort": "id:asc"
                },
                body: {}
            })
        });
        const result = await response.json();
        if (result.ok) {
            const data = result.data;
            const items = data.data || [];
            console.log(`Page ${page}: OK. Items: ${items.length}, Total: ${data.total}, Meta: ${JSON.stringify(data.meta || {})}`);
            return items.length;
        } else {
            console.log(`Page ${page}: FAILED. Error: ${result.error}`);
        }
    } catch (err) {
        console.log(`Page ${page}: EXCEPTION. ${err.message}`);
    }
    return -1;
}

async function run() {
    console.log("--- Sync Diagnostic Report ---");
    await probe(1);
    await probe(45);
    await probe(46);
    await probe(47);
    await probe(48);
    await probe(100);
}

run();
