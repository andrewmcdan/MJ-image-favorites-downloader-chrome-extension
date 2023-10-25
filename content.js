const backgroundMessage = async (property,msg) => {
    let messageRes = null;
    const handleRes = (e) => {
        // console.log({e});
        if(e.hasOwnProperty(property)){
            console.log(property, e);
            messageRes = e[property];
            port.onMessage.removeListener(handleRes);
        }
    }
    port.onMessage.addListener(handleRes);
    port.postMessage(msg);

    while (messageRes === null) {
        await waitSeconds(1);
    }
    return messageRes;
}

const getUserID = async () => {
    return await backgroundMessage('userID',{ msg: 'getUserID'});
}

const getUserData = async (uuid) => {
    return await backgroundMessage('userData',{ msg: 'getUserData', uuid: uuid});
}

const getJobDataImage = async (uuid) => {
    return await backgroundMessage('jobDataImage',{ msg: 'getJobDataImage', uuid: uuid});
}

const getJobDataUser = async (uuid, dateObj) => {
    return await backgroundMessage('jobDataUser',{ msg: 'getJobDataUser', data: uuid, dateObj: dateObj});
}

const getIfJobUserOrImage = async (uuid) => {
    return await backgroundMessage('jobType',{ msg: 'getIfJobUserOrImage', uuid: uuid});
}

const getTotalJobs = async () => {
    return await backgroundMessage('totalJobs',{ msg: 'getTotalJobs'});
}

const getRemainingTime = async () => {
    return await backgroundMessage('remainingTime',{ msg: 'getRemainingTime'});
}

const getJobStatus = async () => {
    return await backgroundMessage('jobStatus',{ msg: 'getJobStatus'});
}

const reloadExtension = async () => {
    console.log(' calling for reload extension (content script)');
    return await backgroundMessage('reloadExt',{ msg: 'reloadExt'});
}

const getThisUserJobsData = async () => {
    return await backgroundMessage('thisUserJobsData',{ msg: 'getThisUserJobsData'});
}


class mainScript{
    constructor(id){
        this.windowListenerID = id;
    }

    sendMessage(msg){
        window.dispatchEvent(new CustomEvent(this.windowListenerID+'c', {detail: msg})); // send a response back to the main script
    }

    setupListener(cb){
        window.addEventListener(this.windowListenerID+'m', function (e) {
            this.doListener = cb;
            this.doListener(e);
        });
    }
}


console.log('Connecting to background script');
// Establish a connection to the background script
var port = chrome.runtime.connect({ name: "content-script" });

if(!port){
    console.log('Unable to connect to background script');
}else{
    console.log('Connected to background script');
}
// let doLoop = true;

// port.postMessage({ greeting: "hello from content script" });

// port.onMessage.addListener(function (msg) {
//     if(msg.hasOwnProperty('returnData')){
//         console.log({ returnData: msg.returnData });
//         doLoop = false;
//     }
//     // calculate time remaining from seconds
//     let timeLeft = msg.remainingTime;
//     let seconds = Math.floor(timeLeft / 1000);
//     let minutes = Math.floor(seconds / 60);
//     let hours = Math.floor(minutes / 60);
//     console.log("Message from background:", msg, `Remaining time: ${hours} hours, ${minutes % 60} minutes, and ${seconds % 60} seconds.`);
// });

const waitSeconds = (s) => new Promise(resolve => setTimeout(resolve, 1000 * s));
// const loop = async () => {
//     while (doLoop) {
//         await waitSeconds(3);
//         await port.postMessage({ msg: 'totalJobs' }, function (response) {
//             console.log({ response });
//         });
//     }
// }


// const andGo = () => {
//     let userID = document.getElementById('userID').value;
//     port.postMessage({ msg: 'go', userID: userID }, function (response) {
//         console.log({ response });
//     });
// }


// window.dispatchEvent(new CustomEvent('content-script-event', {detail: {greeting: 'hello from content script'}}));

// window.addEventListener('main-script-event', function (e) {
//     console.log('main script sent event', e);
//     if(e.detail == 'andGo'){
//         andGo();
//     }
// });

let mainScripts = [];

window.addEventListener('main-script-initiator', function (e) {
    // this event gets fired whenever the page loads and the main script is ready to send and receive events
    console.log('main script sent initiator', e.detail);
    mainScripts.push(new mainScript(e.detail));
    let currentScript = mainScripts[mainScripts.length - 1];
    currentScript.sendMessage('ok');
    currentScript.setupListener(async function(event){
        if(event.detail == 'getUserID'){
            let userID = await getUserID();
            console.log({userID});
            currentScript.sendMessage({userID: userID});
        }
        if(event.detail.msg == 'getUserData'){
            let userData = await getUserData(event.detail.uuid);
            currentScript.sendMessage({userData: userData});
        }
        if(event.detail.msg == 'getJobDataImage'){
            let jobData = await getJobDataImage(event.detail.uuid);
            currentScript.sendMessage({jobDataImage: jobData});
        }
        if(event.detail.msg == 'getJobDataUser'){
            let jobData = await getJobDataUser(event.detail.data);
            currentScript.sendMessage({jobDataUser: jobData});
        }
        if(event.detail.msg == 'getIfJobUserOrImage'){
            let jobType = await getIfJobUserOrImage(event.detail.uuid);
            currentScript.sendMessage({jobType: jobType});
        }
        if(event.detail == 'getTotalJobs'){
            let totalJobs = await getTotalJobs();
            currentScript.sendMessage({totalJobs: totalJobs});
        }
        if(event.detail == 'getRemainingTime'){
            let remainingTime = await getRemainingTime();
            currentScript.sendMessage({remainingTime: remainingTime});
        }
        if(event.detail == 'getJobStatus'){
            console.log('getting job status');
            let jobStatus = await getJobStatus();
            currentScript.sendMessage({jobStatus: jobStatus});
        }
        if(event.detail == 'reloadExt'){
            console.log('reloading extension (content script)');
            reloadExtension();
            // chrome.runtime.reload();
        }
        if(event.detail == 'getThisUserJobsData'){
            console.log('getting this user jobs data');
            let thisUserJobsData = await getThisUserJobsData();
            currentScript.sendMessage({thisUserJobsData: thisUserJobsData});
        }
    });
    // now we have a unique channel to communicate with the main script
});



// loop();

