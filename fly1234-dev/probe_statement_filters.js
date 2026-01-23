const FN_URL = "https://us-central1-my-acc-3ee97.cloudfunctions.net/usersProxy";
const endpoint = "https://accounts.fly4all.com/api/transactions/buyers";
const token = "1cdtzai1n5ksohsq83rogqb56970de4f7e55ed8767115";
const buyerId = "1cdz8c2zqcwcohsq83n0dmzr697320fe36031";

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
            const summary = result.data?.summary;
            console.log(`Params: ${Object.keys(params).filter(k => k !== 'id').join(', ')} -> Summary: ${summary?.from} - ${summary?.to}`);
            return summary;
        }
    } catch (err) { }
    return null;
}

async function run() {
    console.log("Final check for query[from] and query[to]...");
    await probeFilter({ id: buyerId, "query[from]": "2024-01-01", "query[to]": "2024-12-31" });
    await probeFilter({ id: buyerId, "query[startDate]": "2024-01-01" }); // Just in case
}

run();
