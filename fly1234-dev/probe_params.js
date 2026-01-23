const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";
const endpoint = "https://accounts.fly4all.com/api/finance/buyers";
const token = "1cdtzai1n5ksohsq83rogqb56970de4f7e55ed8767115";

async function probeParams(params) {
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
            return result.data?.data?.length || 0;
        }
    } catch (err) { }
    return -1;
}

async function run() {
    console.log("Testing Page Size Parameters...");

    const tests = [
        { "pagination[pageSize]": 50 },
        { "pagination[perpage]": 50 },
        { "pagination[per_page]": 50 },
        { "pagination[limit]": 50 },
        { "pageSize": 50 },
        { "limit": 50 },
        { "per_page": 50 }
    ];

    for (const t of tests) {
        const count = await probeParams(t);
        console.log(`${JSON.stringify(t)} -> Returned ${count} items`);
    }
}

run();
