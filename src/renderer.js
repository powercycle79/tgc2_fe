/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

const serverUrl = async () => {
    return await window.fileApi.getServerUrl();
}

const getFileList = async () => {
    const myHeaders = new Headers();
    myHeaders.append("Accept", "*/*");

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    return await fetch(`${await serverUrl()}/file/list`, requestOptions)
        .then((response) => response.json())
        .catch((error) => console.error(error));
}

const getAnalysisStatus = async (analysisId) => {
    const myHeaders = new Headers();
    myHeaders.append("Accept", "*/*");

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    return await fetch(`${await serverUrl()}/analyze/${analysisId}/status`, requestOptions)
        .then((response) => response.json())
        .catch((error) => console.error(error));
}
const getAnalysisIdByFileId = async (fileId) => {
    const myHeaders = new Headers();
    myHeaders.append("Accept", "*/*");

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    return fetch(`${await serverUrl()}/analyze/files/${fileId}`, requestOptions)
        .then((response) => response.json())
        .catch((error) => console.error(error));
}

const getLogs = async (analysisId) => {
    const myHeaders = new Headers();
    myHeaders.append("Accept", "*/*");

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    return await fetch(`${await serverUrl()}/analyze/${analysisId}/log`, requestOptions)
        .then((response) => response.json())
        .catch((error) => console.error(error));
}

const downloadFile = async (fileId) => {
    console.log('fileId :', fileId);
    const myHeaders = new Headers();
    myHeaders.append("Accept", "*/*");

    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    return await fetch(`${await serverUrl()}/file/${fileId}/download`, requestOptions)
        .then((response) => response.blob())
        .catch((error) => console.error(error));
}

function renderTable(data) {
    const tableBody = document.querySelector("#dynamic-table tbody");
    tableBody.innerHTML = ""; // 초기화
    data.forEach((item) => {
        const row = document.createElement("tr");

        // 번호 셀
        const indexCell = document.createElement("td");
        indexCell.style.textAlign = "center";
        indexCell.textContent = item.id;
        row.appendChild(indexCell);

        // 이름 셀
        const nameCell = document.createElement("td");
        nameCell.textContent = item.name;
        row.appendChild(nameCell);

        // 상태 셀
        const statusCell = document.createElement("td");
        statusCell.style.textAlign = "center";
        statusCell.textContent = item.status;
        row.appendChild(statusCell);

        // 다운로드 버튼 셀
        const downloadCell = document.createElement("td");
        downloadCell.style.textAlign = "center";
        const downloadButton = document.createElement("downbutton");
        downloadButton.textContent = "...";
        downloadButton.style.padding = "5px 10px";
        downloadButton.style.backgroundColor = "#357EC7";
        downloadButton.style.color = "white";
        downloadButton.style.border = "none";
        downloadButton.style.borderRadius = "4px";
        downloadButton.style.cursor = "pointer";

        // 버튼 클릭 이벤트 추가
        downloadButton.addEventListener("click", () => {
            downloadFile(item.id).then(async (blob) => {
                const arrayBuffer = await blob.arrayBuffer();
                const buffer = window.nodeAPI.Buffer(arrayBuffer, 'base64');
                const base64Data = buffer.toString();

                const saveResult = await window.fileApi.saveFile(item.name, base64Data);

                if(saveResult.success) {
                    console.log('File saved successfully');
                } else {
                    console.error('Error saving file:', saveResult.error);
                }
            });
        });

        downloadCell.appendChild(downloadButton);
        row.appendChild(downloadCell);

        // 행 추가
        tableBody.appendChild(row);
    });
}

function getList(){
    const files = [];
    for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        const value = window.localStorage.getItem(key);
        const valueObj = JSON.parse(value);
        files.push({id: key, name: valueObj.name, status: valueObj.status});
    }

    files.sort((a, b) => {
        const aId = Number(a.id);
        const bId = Number(b.id);
        return aId - bId;
    });

    return files;
}

const refreshTable = async () => {
    window.localStorage.clear();

    getFileList().then(async (list) => {
        for(let i = 0; i < list.length; i++) {
            const data = list[i];
            const status = await getAnalysisStatus(data.id);

            window.localStorage.setItem(data.id, JSON.stringify({name: data.name, status: status}));
        }
    }).then(()=>{
        renderTable(getList());
    });
}

window.onload = () => {
    refreshTable();
}

document.getElementById('upload_button').onclick = async () => {
    window.fileApi.selectAndUpload().then(
        async (data) => {
            if (data) {
                const fileId = data.id;
                console.log('data :', data);
                if(window.localStorage.getItem(fileId)) {
                    document.getElementById('output-box').textContent = 'file already uploaded';
                    return;
                }

                window.localStorage.setItem(fileId, JSON.stringify({name: data.name, status: "UPLOADED"}));

                renderTable(getList());

                const messages = [];
                messages.push(`upload done : ${data.name}`);
                messages.push('Analysis started');
                const outputBox = document.getElementById('output-box');
                const analysisId = await getAnalysisIdByFileId(fileId);
                
                while(await getAnalysisStatus(fileId) === "RUNNING") {
                    const logs = await getLogs(analysisId);
                    for(let i = messages.length - 2; i < logs.length; i++) {
                        messages.push(logs[i].message);
                    }

                    const log = messages.join("\n");
                    outputBox.textContent = log;
                    outputBox.scrollTop = outputBox.scrollHeight;
                }
                
                messages.push('Analysis done');
                const log = messages.join("\n");
                outputBox.textContent = log;
                outputBox.scrollTop = outputBox.scrollHeight;

                refreshTable();
            } else {
                document.getElementById('output-box').textContent = 'Invalid file path';
            }
        }
    );
}