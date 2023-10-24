let pauseFetch = false;
let totalJobs = 0;
let currentJobNumber = 0;
let remainingTime = -1;
let theData = [];
let theDataReady = false;
let userIDFromPage = "";
let jobStatus = "waiting";
chrome.runtime.onConnect.addListener(function (port) {
    console.assert(port.name === "content-script");
    port.onMessage.addListener(async function (msg, sendResponse) {
        console.log("Message from content1:", {msg}, {sendResponse});
        if (msg.msg == 'totalJobs') {
            port.postMessage({ reply: "ok", totalJobs: totalJobs, remainingTime: remainingTime });
            if (theDataReady) {
                port.postMessage({ reply: "theData", returnData: theData });
            }
        }
        if (msg.msg == 'go') {
            port.postMessage({ reply: "ok" });
            userIDFromPage = msg.userID;
            theData = await getData();
            theDataReady = true;
        }
        if (msg.msg == 'getUserData') {
            port.postMessage({ reply: "ok" });
            let userD = await getUserData(msg.uuid);
            port.postMessage({ reply: "userData", userData: userD });
        }
        if (msg.msg == 'getUserID') {
            // console.log({ sendResponse });
            port.postMessage({ reply: "ok" });
            let id = await getUserID();
            port.postMessage({ reply: "userID", userID: id });
            // sendResponse.postMessage({ userID: id });
            // console.log({ sendResponse });
        }
        if (msg.msg == 'getJobDataImage') {
            port.postMessage({ reply: "ok" });
            let jobD = await getJobDataImage(msg.uuid);
            port.postMessage({ reply: "jobDataImage", jobDataImage: jobD });
        }
        if(msg.msg == 'getJobDataUser'){
            port.postMessage({ reply: "ok" });
            console.log({ msg })
            let jobD = await getData(msg.data.uuid, {start: msg.data.startDate, end: msg.data.endDate});
            port.postMessage({ reply: "jobDataUser", jobDataUser: jobD });
        }
        if(msg.msg == 'getThisUserJobsData'){
            port.postMessage({ reply: "ok" });
            let jobD = await getThisUserJobsData();
            port.postMessage({ reply: "thisUserJobsData", thisUserJobsData: jobD });
        }
        if(msg.msg == 'reloadExt'){
            console.log('reload extension called for (background script)');
            port.postMessage({ reply: "ok" });
            reloadExtension();
        }
        if(msg.msg == 'getRemainingTime'){
            port.postMessage({ reply: "ok", remainingTime: remainingTime });
        }
        if(msg.msg == 'getJobStatus'){
            port.postMessage({ reply: "ok - getJobStatus" });
            let jobD = getJobStatus();
            port.postMessage({ reply: "jobStatus", jobStatus: jobD });
        }
    });
});

chrome.runtime.onMessage.addListener(async function (msg, send, sendResponse) {
    console.log("Message from content3:", msg);
    if (msg.hasOwnProperty('action')) {
        if (msg.action === 'ready') {
            theData = await getData();
            theDataReady = true;
        } else if (msg.action === 'continue') {
            pauseFetch = false;
        } else if (msg.action === 'pause') {
            pauseFetch = true;
        }
    }
});

const waitSeconds = (s) => new Promise(resolve => setTimeout(resolve, 1000 * s));

const calculateTotalJobs = (data) => {
    let totalJobs = 0;
    data.forEach(element => {
        totalJobs += element.length;
        console.log({ element });
    });
    return totalJobs;
}

const getData = async (uuid = null, dateObj = null) => {
    jobStatus = "started";
    totalJobs = 0;
    currentJobNumber = 0;
    remainingTime = -1;


    let userID;
    if (userIDFromPage === "") {
        userID = await getUserID();
    } else {
        userID = userIDFromPage;
    }
    if(uuid !== null){
        userID = uuid;
    }
    let startTimestamp = Date.now();
    let returnData = [];
    let archiveData = [];
    let startDate;
    let endDate;
    if(dateObj === null){
        startDate = new Date("October 01, 2023");
        endDate = new Date("October 06, 2023");
    }else{
        // convert date string into better date string because JS is stupid and insists on using UTC
        let year = dateObj.start.split("-")[0];
        let month = dateObj.start.split("-")[1];
        let day = dateObj.start.split("-")[2];
        // convert month number into name
        let monthname = new Date(dateObj.start + "T00:00:00").toLocaleString('default', { month: 'long' });
        let fullDate = `${monthname} ${day}, ${year}`;
        startDate = new Date(fullDate);
        year = dateObj.end.split("-")[0];
        month = dateObj.end.split("-")[1];
        day = dateObj.end.split("-")[2];
        // convert month number into name
        monthname = new Date(dateObj.end + "T00:00:00").toLocaleString('default', { month: 'long' });
        fullDate = `${monthname} ${day}, ${year}`;
        endDate = new Date(fullDate);
    }
    // Iterate through the dates and perform API calls
    // for (let currentDate = startDate; currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
    for (let currentDate = endDate; currentDate >= startDate; currentDate.setDate(currentDate.getDate() - 1)) {
        jobStatus = "fetching days";
        // get current time 
        const settings = { "batch": 0, "date": {} };
        settings.date.year = currentDate.getFullYear();
        settings.date.month = currentDate.getMonth() + 1;
        settings.date.day = currentDate.getDate();
        // Fetch the archive data
        const archiveResponse = await fetch(`https://www.midjourney.com/api/app/archive/day/?day=${settings.date.day}&month=${settings.date.month}&year=${settings.date.year}&userId=${userID}&includePrompts=true`);
        if (archiveResponse.status === 403) {
            throw new Error(error.innerText);
        }
        archiveData.push(await archiveResponse.json());
        console.log({ archiveData });
    }

    totalJobs = calculateTotalJobs(archiveData);
    console.log({ totalJobs });

    let redoJobs = [];
    jobStatus = "fetching jobs";
    for (day of archiveData) {
        // Process each item in the archive data
        for (item of day) {
            item = item.id;
            while (pauseFetch) {
                await waitSeconds(1);
            }
            // const jobId = item.id;
            await waitSeconds(0.1);
            const jobId = item;
            // Fetch the job status data
            // console.log({ jobId });
            let jobStatusResponse;
            let fetchWait = fetch("https://www.midjourney.com/api/app/job-status/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobIds: [jobId] }),
                timeout: 10000
            }).then((response) => {
                jobStatusResponse = response;
            }).catch((error) => {
                console.log({ error });
                redoJobs.push(jobId);
            });
            await Promise.all([fetchWait]);
            if (jobStatusResponse.status !== 200) {
                console.log({ jobStatusResponse });
                redoJobs.push(jobId);
                continue;
            }
            currentJobNumber++;
            // calculate time left based on current job number
            let timeLeft = (Date.now() - startTimestamp) / currentJobNumber * (totalJobs - currentJobNumber);
            remainingTime = timeLeft;
            // convert time left to hours, minutes, seconds
            let seconds = Math.floor(timeLeft / 1000);
            let minutes = Math.floor(seconds / 60);
            let hours = Math.floor(minutes / 60);
            console.log(`Time left: ${hours} hours, ${minutes % 60} minutes, ${seconds % 60} seconds`);
            const jobStatusData = await jobStatusResponse.json();
            returnData.push(jobStatusData);
            // console.log(jobStatusData);
        }
        // Jobs that failed to download will be retried.
        if (redoJobs.length > 0) {
            jobStatus = "redoing redos";
            console.log({ redoJobs });
            for (const jobId of redoJobs) {
                await waitSeconds(0.1);

                console.log({ jobId });
                let jobStatusResponse;
                let fetchWait = fetch("https://www.midjourney.com/api/app/job-status/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ jobIds: [jobId] }),
                    timeout: 10000
                }).then((response) => {
                    jobStatusResponse = response;
                }).catch((error) => {
                    console.log("Error fetching job-status. Error:\n", { error });
                    // redoJobs.push(jobId);
                });
                await Promise.all([fetchWait]);
                if (jobStatusResponse.status !== 200) {
                    console.log({ jobStatusResponse });
                    // redoJobs.push(jobId);
                    continue;
                }
                const jobStatusData = await jobStatusResponse.json();
                // console.log(jobStatusData);
                returnData.push(jobStatusData);
            }
        }
    }
    remainingTime = -1;
    jobStatus = "done";
    return returnData;
}

const getThisUserJobsData = async () => {
    let userUUID = await getUserID();
    let numberOfJobsReturned = 0;
    let returnedData = [];
    let cursor = "";

    let loopCount = 0;
    do{
        let response = await fetch("https://beta.midjourney.com/api/pg/thomas-jobs?user_id=" + userUUID + "&page_size=10000" + (cursor == "" ? "" : "&cursor=" + cursor), {
            "headers": {
              "accept": "*/*",
              "accept-language": "en-US,en;q=0.9",
              "cache-control": "no-cache",
              "content-type": "application/json",
              "pragma": "no-cache",
              "sec-ch-ua": "\"Chromium\";v=\"118\", \"Google Chrome\";v=\"118\", \"Not=A?Brand\";v=\"99\"",
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": "\"Windows\"",
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "no-cors",
              "sec-fetch-site": "same-origin",
              "cookie": "_ga=GA1.1.167389610.1696560556; intercom-id-gp8wgfwe=c08504b0-3745-497f-b33b-abc4fd1bf5cc; intercom-device-id-gp8wgfwe=ae7b76b3-959c-476e-86d9-f1f07410bd8f; AMP_MKTG_437c42b22c=JTdCJTdE; AMP_437c42b22c=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjIxNTkzOTUxMy1kOWVhLTQ2M2MtODAwMi0xMGQ1NWZiZGIzYjclMjIlMkMlMjJ1c2VySWQlMjIlM0ElMjJmNjZiYTY1Ni1mYzFiLTQzNjYtOGVjOC1jZjUyY2JjNDczMDklMjIlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNjk4MTAzMzQ3ODU4JTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTY5ODEwNDk3NzQ1NCUyQyUyMmxhc3RFdmVudElkJTIyJTNBMzA3JTdE; _ga_Q0DQ5L7K0D=GS1.1.1698103347.36.1.1698104978.0.0.0; AMP_MKTG_74801b10c7=JTdCJTdE; cf_clearance=M5ifSC5XkRqqeIDNjYXC39zCbFLRdihOtC3rHelLRVQ-1698106961-0-1-e1a9dc1f.96e76b22.b7d06228-0.2.1698106961; Midjourney.AuthUserToken=eyJpZFRva2VuIjoiZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNklqQXpaREEzWW1Kak0yUTNOV00yT1RReU56VXhNR1kyTVRjMFpXSXlaakUyTlRRM1pEUmhOMlFpTENKMGVYQWlPaUpLVjFRaWZRLmV5SnVZVzFsSWpvaVlTNXRZMlF1SWl3aWNHbGpkSFZ5WlNJNklqTmhOMlZpTmpNeVlUQXlZV1kxTVRRNVlXVmhPV0ZoTjJNeFpUaGhNV1F4SWl3aWJXbGthbTkxY201bGVWOXBaQ0k2SW1ZMk5tSmhOalUyTFdaak1XSXRORE0yTmkwNFpXTTRMV05tTlRKalltTTBOek13T1NJc0ltbHpjeUk2SW1oMGRIQnpPaTh2YzJWamRYSmxkRzlyWlc0dVoyOXZaMnhsTG1OdmJTOWhkWFJvYW05MWNtNWxlU0lzSW1GMVpDSTZJbUYxZEdocWIzVnlibVY1SWl3aVlYVjBhRjkwYVcxbElqb3hOams0TVRBMk9UY3hMQ0oxYzJWeVgybGtJam9pUkhsbVpVcDJTbVYyWjFaaFl6RnJUbkJXT1dwTU9VbDJPRFIzTVNJc0luTjFZaUk2SWtSNVptVktka3BsZG1kV1lXTXhhMDV3VmpscVREbEpkamcwZHpFaUxDSnBZWFFpT2pFMk9UZ3hNRFk1TnpFc0ltVjRjQ0k2TVRZNU9ERXhNRFUzTVN3aVpXMWhhV3dpT2lKaGJtUnlaWGR0WTJSaGJrQm5iV0ZwYkM1amIyMGlMQ0psYldGcGJGOTJaWEpwWm1sbFpDSTZkSEoxWlN3aVptbHlaV0poYzJVaU9uc2lhV1JsYm5ScGRHbGxjeUk2ZXlKa2FYTmpiM0prTG1OdmJTSTZXeUl4TnpReU9UVXpPVEF3TmpneU56Y3lORGdpWFN3aVpXMWhhV3dpT2xzaVlXNWtjbVYzYldOa1lXNUFaMjFoYVd3dVkyOXRJbDE5TENKemFXZHVYMmx1WDNCeWIzWnBaR1Z5SWpvaVpHbHpZMjl5WkM1amIyMGlmWDAuT2pGbkxUTDJFUmpDQ1FKWWFLQl94QVNTUTNqck5ZSlZhOUpaWW01MnZidkJYQ2FkM3l3STNteW1FREhEcGZsMkNYNGFmMVBzWV9jT3dEc2M5NUZZT082UkN5SGswVklUZlVkNEotcGdfMXhYYUYyS1ZQaTM3MGNFMFB3WWdCcnNabUQ5TmNZM3pxVVduclBUd3piWU9xLUFIOVZ3QUtxdWtGQThPQmtiUHR0ZHZDWGEwemdFMDNfdThTUVdzdVdTZGZ6ZXZ2RXRaM0RXTDJoRGloZ2RoTndoUDZpTHRwLTBuRmNtVjItem1GNjduSng0ZVZ4ZURKX2VXR1dpSmhfQW1UR1FaendocXdGRFl2MVFWX0gyTVctcnZKR2pKS1FLR0hGS0t0SF82QkpveG00c0t1dTN1SjJZenVZSDhwT3BPZXUxc19vMWhZRzBsTXNORFRWV2xRIiwicmVmcmVzaFRva2VuIjoiQU1mLXZCejUzU1dFdVJDT1NNZDd1dXFSZjU5RWloVmx1NmRIWnVPTUp5WUxzTkstYnVMWFV4TjRXWUVQRTFDRnRPQkJRTHA1b1RJN0VIdmVUWG1KOHpLOFFrRmIwTDd5dVd3dUlwcjFUOWxlNnNMeGVsZ1pESlJZclEyeUxtSDZzTEk5bGRFWjZhNURYV2l1NlVLcXliRUs4d2Y4bVdNdy02Z2R3YmhUZ1BLZVV6VjlEcnFJOU0xM3lILWdoMzVmcGU0XzdHeEpKYTloajE3T0JrUkRiUXpidEhsb3kxaEd5RFctd0tfSU5ZWWNWVHhnLTUwMHZ3SkkzaXFpUlNBcnpwVnBLWXpUV0lQaS1xRzFucUljWGg3Q1dPUUJDclB5dGY3ZXlaZGRydGJoNnZTTXRSUVZDOWMifQ; Midjourney.AuthUserToken.sig=-PAFXF4J32BFPY9owU3IQr3Ah2JXM-1kGcP58JBIVes; Midjourney.AuthUser=eyJpZCI6IkR5ZmVKdkpldmdWYWMxa05wVjlqTDlJdjg0dzEiLCJtaWRqb3VybmV5X2lkIjoiZjY2YmE2NTYtZmMxYi00MzY2LThlYzgtY2Y1MmNiYzQ3MzA5IiwiZW1haWwiOiJhbmRyZXdtY2RhbkBnbWFpbC5jb20iLCJlbWFpbFZlcmlmaWVkIjp0cnVlLCJwaG9uZU51bWJlciI6bnVsbCwiZGlzcGxheU5hbWUiOiJhLm1jZC4iLCJwaG90b1VSTCI6IjNhN2ViNjMyYTAyYWY1MTQ5YWVhOWFhN2MxZThhMWQxIiwiYWJpbGl0aWVzIjp7ImFkbWluIjpmYWxzZSwiZGV2ZWxvcGVyIjpmYWxzZSwiYWNjZXB0ZWRfdG9zIjp0cnVlLCJtb2RlcmF0b3IiOmZhbHNlLCJndWlkZSI6ZmFsc2UsImNvbW11bml0eSI6ZmFsc2UsInZpcCI6ZmFsc2UsImVtcGxveWVlIjpmYWxzZSwiYWxsb3dfbnNmdyI6ZmFsc2UsInRlc3RlciI6ZmFsc2UsImNvb2xkb3duc19yZW1vdmVkIjpmYWxzZSwiYmxvY2tlZCI6ZmFsc2UsImNhbl90ZXN0IjpmYWxzZSwiaXNfc3Vic2NyaWJlciI6dHJ1ZSwiY2FuX3ByaXZhdGUiOmZhbHNlLCJjYW5fcmVsYXgiOnRydWUsImlzX3RyaWFsIjpmYWxzZX0sIndlYnNvY2tldEFjY2Vzc1Rva2VuIjoiZXlKMWMyVnlYMmxrSWpvaVpqWTJZbUUyTlRZdFptTXhZaTAwTXpZMkxUaGxZemd0WTJZMU1tTmlZelEzTXpBNUlpd2lkWE5sY201aGJXVWlPaUpoTG0xalpDNGlMQ0pwWVhRaU9qRTJPVGd4TURZNU56Ujkuc2tmUWE1bnpRaUdkdExZcmNtamFrQmw3bGRyLXhqOHVWR2l4azVsRGV5RSJ9; customSettings_v4=%7B%22stylize%22%3A100%7D; darkMode=enabled; __cf_bm=vPXQMOcaGhXT1kGWRwnp0uQm0g4yHfJwUygVKry.k8s-1698107339-0-ARCMqspLCIah6tr4c/NUXn3GihbYc2OLA0qw0Pz/iBQ6Fdbe0cpP+eFkQZxZOr5IEwsMClfrC1CwFByUiS09VhQ=; AMP_74801b10c7=JTdCJTIyZGV2aWNlSWQlMjIlM0ElMjJmMTFlNDU1NC1kYjBkLTRmY2EtODYxOS0zN2VlZDc3MmMxYjElMjIlMkMlMjJ1c2VySWQlMjIlM0ElN0IlMjJkZWZhdWx0VHJhY2tpbmclMjIlM0ElN0IlMjJmaWxlRG93bmxvYWRzJTIyJTNBZmFsc2UlMkMlMjJmb3JtSW50ZXJhY3Rpb25zJTIyJTNBZmFsc2UlMkMlMjJwYWdlVmlld3MlMjIlM0FmYWxzZSUyQyUyMnNlc3Npb25zJTIyJTNBZmFsc2UlN0QlN0QlMkMlMjJzZXNzaW9uSWQlMjIlM0ExNjk4MTA2OTYyMTgzJTJDJTIyb3B0T3V0JTIyJTNBZmFsc2UlMkMlMjJsYXN0RXZlbnRUaW1lJTIyJTNBMTY5ODEwNjk5MTM0MCUyQyUyMmxhc3RFdmVudElkJTIyJTNBMSU3RA==",
              "Referer": "https://beta.midjourney.com/imagine",
              "Referrer-Policy": "origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
          });




        let data = await response.json();
        console.log({data});
        if(data.data.length == 0)break;
        numberOfJobsReturned = data.data.length;
        // put all the returned data into the returnedData array
        returnedData.push(...(data.data));
        cursor = data.cursor;
        loopCount++;
        if(loopCount > 100)break;
    }while(numberOfJobsReturned == 10000)
    return returnedData;
}

const getUserID = async () => {
    const response = await fetch("https://www.midjourney.com/api/auth/session/");
    const data = await response.json();
    console.log(data.user.id);
    return data.user.id;
}

const getUserData = async (uuid) => {
    const response = await fetch("https://www.midjourney.com/api/app/users/?userIds=" + uuid);
    const data = await response.json();
    console.log(data);
    return data;
}

const getJobDataImage = async (uuid) => {
    console.log({ uuid });
    let jobStatusResponse;
    let fetchWait = fetch("https://www.midjourney.com/api/app/job-status/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: [uuid] }),
        timeout: 10000
    }).then((response) => {
        jobStatusResponse = response;
    }).catch((error) => {
        console.log({ error });
        // redoJobs.push(uuid);
    });
    await Promise.all([fetchWait]);
    if (jobStatusResponse.status !== 200) {
        console.log({ jobStatusResponse });
        // redoJobs.push(uuid);
        return null;
    }
    const jobStatusData = await jobStatusResponse.json();
    return jobStatusData;
}

const getJobStatus = () => {
    return jobStatus;
}
    

const reloadExtension = ()=>{
    console.log("Reloading extension");
    chrome.runtime.reload();
}

// let allData = []; let eachData = {}; let jobCount = 1;
// do{
//     let a25fetch = await fetch("https://www.midjourney.com/api/app/recent-jobs/?amount=25&dedupe=true&jobStatus=completed&jobType=grid&minRankingScore=0&orderBy=new&page=" + jobCount + "&prompt=undefined&refreshApi=0&searchType=advanced&service=null&userId=c95cd495-477b-4f04-b2a9-47f456f9e42d");
//     eachData = await a25fetch.json();
//     allData.push(eachData);
//     jobCount++;
// }while(eachData.length >= 25);
// console.log(allData);


// let allData = []; let eachData = {}; let jobCount = 1;
// do{
//     let a25fetch = await fetch("https://www.midjourney.com/api/app/archive/day/?day=30&month=9&year=2023&userId=c95cd495-477b-4f04-b2a9-47f456f9e42d&includePrompts=true);
//     eachData = await a25fetch.json();
//     allData.push(eachData);
//     jobCount++;
// }while(eachData.length >= 25);
// console.log(allData);

/// https://www.midjourney.com/api/app/archive/day/?day=30&month=9&year=2023&userId=c95cd495-477b-4f04-b2a9-47f456f9e42d&includePrompts=true

//  https://www.midjourney.com/api/app/vector-search/?amount=50&dedupe=true&jobStatus=completed&jobType=upscale&orderBy=new&prompt=https%3A%2F%2Fcdn.midjourney.com%2F0742196e-3f08-407c-a5ac-38ffb2c9304d%2F0_1.webp&refreshApi=0&searchType=vector&service=null&user_id_ranked_score=0%2C4%2C5&_ql=todo&_qurl=https%3A%2F%2Fwww.midjourney.com%2Fapp%2Fusers%2F473c7668-d60c-48d0-81c3-a14fef8c7a17%2F%3FjobId%3D66f1f872-854f-44a5-99c0-2bbd9bf65dad

// fetch("https://www.midjourney.com/api/app/job-status/", {
//   "headers": {
//     "accept": "*/*",
//     "accept-language": "en-US,en;q=0.9",
//     "cache-control": "no-cache",
//     "content-type": "application/json",
//     "pragma": "no-cache",
//     "sec-ch-ua": "\"Chromium\";v=\"118\", \"Google Chrome\";v=\"118\", \"Not=A?Brand\";v=\"99\"",
//     "sec-ch-ua-mobile": "?0",
//     "sec-ch-ua-platform": "\"Windows\"",
//     "sec-fetch-dest": "empty",
//     "sec-fetch-mode": "cors",
//     "sec-fetch-site": "same-origin",
//     "Referer": "https://www.midjourney.com/app/users/473c7668-d60c-48d0-81c3-a14fef8c7a17/archive/?jobId=73ab74d3-6c36-4999-ba66-0898e7618c85",
//     "Referrer-Policy": "origin-when-cross-origin"
//   },
//   "body": "{\"jobIds\":[\"73ab74d3-6c36-4999-ba66-0898e7618c85\"]}",
//   "method": "POST"
// });



// get the grid version with all 4 images
/// https://cdn.midjourney.com/0742196e-3f08-407c-a5ac-38ffb2c9304d/grid_0.webp
/// https://cdn.midjourney.com/73ab74d3-6c36-4999-ba66-0898e7618c85/grid_0.webp

// get down-scaled version
/// https://cdn.midjourney.com/0742196e-3f08-407c-a5ac-38ffb2c9304d/0_0_384_N.webp
/// https://cdn.midjourney.com/0742196e-3f08-407c-a5ac-38ffb2c9304d/grid_0_384_N.webp
/// https://cdn.midjourney.com/0742196e-3f08-407c-a5ac-38ffb2c9304d/0_0_32_N.webp

// scaled down with quality setting
// https://cdn.midjourney.com/8ae0bac5-3588-42e1-85d2-2356d1ead2ab/0_0_384_N.webp?quality=100&qst=6