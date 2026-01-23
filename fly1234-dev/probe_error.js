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
        console.log(`Page ${page} Result:`, JSON.stringify(result));
    } catch (err) { console.log(`Page ${page} Exception:`, err.message); }
}

async function run() {
    await probe(460);
    await probe(461);
}

run();
