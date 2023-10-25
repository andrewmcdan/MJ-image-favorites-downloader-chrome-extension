let pauseFetch = false;
let totalJobs = 0;
let currentJobNumber = 0;
let remainingTime = -1;
let theData = [];
let theDataReady = false;
let userIDFromPage = "";
let jobStatus = "waiting";
chrome.runtime.onConnect.addListener(function (port) {
    // console.assert(port.name === "content-script");
    port.onMessage.addListener(async function (msg, sendResponse) {
        console.log("Message from content1:", { msg }, { sendResponse });
        if (msg.msg == 'totalJobs') {
            port.postMessage({ reply: "ok", totalJobs: totalJobs, remainingTime: remainingTime });
            // if (theDataReady) {
            //     port.postMessage({ reply: "theData", returnData: theData });
            // }
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
        if (msg.msg == 'getJobDataUser') {
            port.postMessage({ reply: "ok" });
            // console.log({ msg })
            let jobD = await getData(msg.data.uuid, { start: msg.data.startDate, end: msg.data.endDate });
            port.postMessage({ reply: "jobDataUser", jobDataUser: jobD });
        }
        if (msg.msg == 'getThisUserJobsData') {
            port.postMessage({ reply: "ok" });
            let jobD = await getThisUserJobsData();
            port.postMessage({ reply: "thisUserJobsData", thisUserJobsData: jobD });
        }
        if (msg.msg == 'reloadExt') {
            // console.log('reload extension called for (background script)');
            port.postMessage({ reply: "ok" });
            reloadExtension();
        }
        if (msg.msg == 'getRemainingTime') {
            port.postMessage({ reply: "ok", remainingTime: remainingTime });
        }
        if (msg.msg == 'getJobStatus') {
            port.postMessage({ reply: "ok" });
            let jobD = getJobStatus();
            port.postMessage({ reply: "jobStatus", jobStatus: jobD });
        }
        if (msg.msg = "getIfJobUserOrImage") {
            port.postMessage({ reply: "ok" });
            if (msg.uuid !== undefined && msg.uuid !== null && msg.uuid !== "") {
                let jobD = await getIfJobUserOrImage(msg.uuid);
                port.postMessage({ reply: "jobType", jobType: jobD });
            }
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
    if (userIDFromPage === "") userID = await getUserID();
    else userID = userIDFromPage;
    if (uuid !== null) userID = uuid;
    let startTimestamp = Date.now();
    let returnData = [];
    let archiveData = [];
    let startDate;
    let endDate;
    if (dateObj === null) {
        startDate = new Date("October 06, 2023");
        endDate = new Date("October 06, 2023");
    } else {
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
    do {
        let response = await fetch("https://beta.midjourney.com/api/pg/thomas-jobs?user_id=" + userUUID + "&page_size=10000" + (cursor == "" ? "" : "&cursor=" + cursor));
        let data = await response.json();
        // console.log({data});
        if (data.data.length == 0) break;
        numberOfJobsReturned = data.data.length;
        // put all the returned data into the returnedData array
        returnedData.push(...(data.data));
        cursor = data.cursor;
        loopCount++;
        if (loopCount > 100) break; // if we've returned more than 1,000,000 jobs, there's probably something wrong, and there's gonna be problems
    } while (numberOfJobsReturned == 10000)
    return returnedData;
}

const getUserID = async () => {
    const response = await fetch("https://www.midjourney.com/api/auth/session/");
    const data = await response.json();
    // console.log(data.user.id);
    return data.user.id;
}

const getUserData = async (uuid) => {
    const response = await fetch("https://www.midjourney.com/api/app/users/?userIds=" + uuid);
    const data = await response.json();
    // console.log(data);
    return data;
}

const getJobDataImage = async (uuid) => {
    // console.log({ uuid });
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
    });
    await Promise.all([fetchWait]);
    if (jobStatusResponse.status !== 200) {
        console.log({ jobStatusResponse });
        return null;
    }
    const jobStatusData = await jobStatusResponse.json();
    return jobStatusData;
}

const getIfJobUserOrImage = async (uuid) => {
    let ret = {};
    let userData = await getUserData(uuid);
    // console.log({ userData });
    if (userData.length > 0) {
        // this is a user
        ret.type = "user";
        ret.data = userData;
        return ret;
    }
    let imageData = await getJobDataImage(uuid);
    // console.log({ imageData });
    if (imageData.hasOwnProperty('_job_type')) {
        // this is an image
        if (imageData.image_paths.length > 1) {
            ret.type = "grid";
            ret.data = imageData;
            return ret;
        }
        ret.type = "image";
        ret.data = imageData;
        return ret;
    }
    ret.type = "unknown";
    ret.data = {};
    return ret;
}

const getJobStatus = () => {
    return jobStatus;
}


const reloadExtension = () => {
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