// run something on the MJ pages
const waitSeconds = (s) => new Promise(resolve => setTimeout(resolve, 1000 * s));
let imagineProps = {};

console.log('Connecting to background script');
// Establish a connection to the background script
var port = false;


const backgroundConnect = async () => {
    while (!port) {
        console.log('Connecting to background script');
        port = chrome.runtime.connect({ name: "MJcontent-script" });
        await waitSeconds(1);
    }
    port.onMessage.addListener(async (msg) => {
        console.log("message received in MJcontent script");
        console.log({msg});
        if(msg.msg == "thisUserJobsData"){
            let thisUserJobsData = await getThisUserJobsData();
            port.postMessage({thisUserJobsData});
        }
    });
}

backgroundConnect();


const getThisUserJobsData = async () => {
    let userUUID = await getUserUUID();
    let numberOfJobsReturned = 0;
    let returnedData = [];
    let cursor = "";
    let loopCount = 0;
    do {
        // let response = await fetch("https://www.midjourney.com/api/pg/thomas-jobs?user_id=" + userUUID + "&page_size=10000" + (cursor == "" ? "" : "&cursor=" + cursor));
        
        let response = await fetch("https://www.midjourney.com/api/pg/thomas-jobs?user_id="+ userUUID + "&page_size=10000" + (cursor == "" ? "" : "&cursor=" + cursor), {
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
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "same-origin",
              "x-csrf-protection": "1"
            },
            "referrer": "https://www.midjourney.com/imagine",
            "referrerPolicy": "origin-when-cross-origin",
            "body": null,
            "method": "GET",
            "mode": "cors",
            "credentials": "include"
          });


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

const getUserUUID = async () => {
    let homePage = await fetch("https://www.midjourney.com/imagine");
    let homePageText = await homePage.text();
    let nextDataIndex = homePageText.indexOf("__NEXT_DATA__");
    let nextData = homePageText.substring(nextDataIndex);
    let startOfScript = nextData.indexOf("json\">");
    let endOfScript = nextData.indexOf("</script>");
    let script = nextData.substring(startOfScript + 6, endOfScript);
    let json = script.substring(script.indexOf("{"), script.lastIndexOf("}") + 1);
    let data = JSON.parse(json);
    imagineProps = data.props;
    let userUUID = data.props.initialAuthUser.midjourney_id;
    return userUUID;
}