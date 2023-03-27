import { getStatusText } from "@webrecorder/wabac/src/utils.js";

const CONTENT_LENGTH = "content-length";
const CONTENT_TYPE = "content-type";
const EXCLUDE_HEADERS = ["content-encoding", "transfer-encoding"];


// ===========================================================================
export class RequestResponseInfo
{
  constructor(requestId) {
    this._created = new Date();
    
    this.requestId = requestId;

    this.ts = null;

    // request data
    this.method = null;
    this.url = null;
    this.protocol = "HTTP/1.1";

    this.requestHeaders = null;
    this.requestHeadersText = null;

    this.postData = null;
    this.hasPostData = false;

    // response data
    this.status = 0;
    this.statusText = null;

    this.responseHeaders = null;
    this.responseHeadersList = null;
    this.responseHeadersText = null;

    this.payload = null;

    this.fromServiceWorker = false;

    this.fetch = false;

    this.resourceType = null;

    this.extraOpts = {};
  }

  fillRequest(params) {
    this.url = params.request.url;
    this.method = params.request.method;
    if (!this.requestHeaders) {
      this.requestHeaders = params.request.headers;
    }
    this.postData = params.request.postData;
    this.hasPostData = params.request.hasPostData;

    if (params.type) {
      this.resourceType = params.type;
    }

    //this.loaderId = params.loaderId;
  }

  fillFetchRequestPaused(params) {
    this.fillRequest(params);

    this.status = params.responseStatusCode;
    this.statusText = params.responseStatusText || getStatusText(this.status);

    this.responseHeadersList = params.responseHeaders;

    this.fetch = true;
    this.resourceType = params.resourceType;
  }

  fillResponse(response) {
    // if initial fetch was a 200, but now replacing with 304, don't!
    if (response.status == 304 && this.status && this.status != 304 && this.url) {
      return;
    }

    this.url = response.url.split("#")[0];
    
    this.status = response.status;
    this.statusText = response.statusText || getStatusText(this.status);

    this.protocol = response.protocol;

    if (response.requestHeaders) {
      this.requestHeaders = response.requestHeaders;
    }
    if (response.requestHeadersText) {
      this.requestHeadersText = response.requestHeadersText;
    }

    this.responseHeaders = response.headers;

    if (response.headersText) {
      this.responseHeadersText = response.headersText;
    }

    this.fromServiceWorker = !!response.fromServiceWorker; 

    if (response.securityDetails) {
      const issuer = response.securityDetails.issuer || "";
      const ctc = response.securityDetails.certificateTransparencyCompliance === "compliant" ? "1" : "0";
      this.extraOpts.cert = {issuer, ctc};
    }
  }

  fillResponseReceivedExtraInfo(params) {
    // this.responseHeaders = params.headers;
    // if (params.headersText) {
    //   this.responseHeadersText = params.headersText;
    // }
    this.extraOpts.ipType = params.resourceIPAddressSpace;
  }

  fillRequestExtraInfo(params) {
    this.requestHeaders = params.headers;
  }

  getResponseHeadersText() {
    let headers = `${this.protocol} ${this.status} ${this.statusText}\r\n`;

    for (const header of Object.keys(this.responseHeaders)) {
      headers += `${header}: ${this.responseHeaders[header].replace(/\n/g, ", ")}\r\n`;
    }
    headers += "\r\n";
    return headers;
  }

  hasRequest() {
    return this.method && (this.requestHeaders || this.requestHeadersText);
  }

  getRequestHeadersDict() {
    return this._getHeadersDict(this.requestHeaders, null);
  }

  getResponseHeadersDict(length) {
    return this._getHeadersDict(this.responseHeaders, this.responseHeadersList, length);
  }

  _getHeadersDict(headersDict, headersList, actualContentLength) {
    if (!headersDict && headersList) {
      headersDict = {};

      for (const header of headersList) {
        const headerName = header.name.toLowerCase();
        if (EXCLUDE_HEADERS.includes(headerName)) {
          continue;
        }
        if (actualContentLength && headerName === CONTENT_LENGTH) {
          headersDict[headerName] = "" + actualContentLength;
          continue;
        }
        headersDict[headerName] = header.value.replace(/\n/g, ", ");
      }
    }

    let headers = null;

    if (!headersDict) {
      return {headers: new Headers(), headersDict: {}};
    }

    try {
      headers = new Headers(headersDict);
    } catch (e) {
      for (const key of Object.keys(headersDict)) {
        if (key[0] === ":") {
          delete headersDict[key];
          continue;
        }
        const keyLower = key.toLowerCase();
        if (EXCLUDE_HEADERS.includes(keyLower)) {
          continue;
        }
        if (actualContentLength && keyLower === CONTENT_LENGTH) {
          headersDict[key] = "" + actualContentLength;
          continue;
        }
        headersDict[key] = headersDict[key].replace(/\n/g, ", ");
      }
      try {
        headers = new Headers(headersDict);
      } catch (e) {
        console.warn(e);
        headers = new Headers();
      }
    }

    return {headers, headersDict};
  }

  isValidBinary() {
    if (!this.payload) {
      return false;
    }

    const length = this.payload.length;

    const { headers } = this.getResponseHeadersDict();
    const contentType = headers.get(CONTENT_TYPE);
    const contentLength = headers.get(CONTENT_LENGTH);

    if (Number(contentLength) !== length) {
      return false;
    }

    if (contentType && contentType.startsWith("text/html")) {
      return false;
    }

    return true;
  }
}