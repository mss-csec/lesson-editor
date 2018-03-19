export const GITHUB_BASE_URL = 'https://api.github.com';

// noop for now
function log() {}

export default class GitHub {
  constructor(token) {
    this.token = token;
    this.cache = {};
  }

  doAction(endpoint, method = 'GET', options = {}) {
    return new Promise((res, rej) => {
      const url = `${API_BASE_URL}/${endpoint}`,
            cacheUrl = `${url}#${encodeURIComponent(JSON.stringify(options.params))}`;

      let headers = new Headers();
      headers.append('Accept', 'application/json');
      headers.append('Authorization', 'token ' + this.token);

      if (this.cache.hasOwnProperty(cacheUrl) && this.cache[cacheUrl].hasOwnProperty('lastModified')) {
        headers.append('If-Modified-Since', this.cache[cacheUrl].lastModified);
      }

      let searchParams = new URLSearchParams();

      if (options.params) {
        for (let s in options.params) {
          searchParams.append(s, options.params[s]);
        }

        searchParams = '?' + searchParams.toString();
        // delete options.params;
      }

      fetch(`${url}${searchParams}`, {
        method,
        headers,
        mode: 'cors',
        ...options
      })
        .then(resp => {
          if (300 <= resp.status && resp.status < 400) {
            log('Returning from cache')

            return Promise.resolve(this.cache[cacheUrl].json);
          } else if (resp.ok) {
            return resp.text().then(text => {
              let thing = { json: text };

              if (resp.headers.has('Last-Modified')) {
                thing.lastModified = resp.headers.get('Last-Modified')
              }

              this.cache[cacheUrl] = thing;

              return Promise.resolve(text);
            });
          } else {
            rej(log('Bad request!'))
          }

          return resp.text();
        })
        .then(body => {
          if (options.body) {
            log(`${method}: ${url}${searchParams}`, options.body, body);
          } else {
            log(`${method}: ${url}${searchParams}`, body);
          }

          res(JSON.parse(body));
        });
    });
  }

  static authenticate(proxyUrl, clientId, state) {
    return new Promise((res, rej) => {
      // Open a popup to the GitHub auth page
      const popup = window.open(
        `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&state=${state}`,
        "GitHub_OAuth_Identity",
        "height=720,width=600,dependent"
      );

      // The state and code is posted back from the popup via postMessage
      const messageHandler = (event) => {
        if (event.origin !== location.origin) {
          return rej('Auth error: authentication message from incorrect origin');
        }

        window.removeEventListener('message', messageHandler);

        // event.data is the code and CORS state
        let params = new URLSearchParams(event.data);

        if (params.get('state') !== state) {
          return rej('OAuth error: bad state received');
        }

        // Proxy the second auth step so we don't have to reveal the client secret
        fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          mode: 'cors',
          cache: 'no-cache',
          body: JSON.stringify({
            clientId,
            state,
            code: params.get('code')
          })
        })
          .then(resp => {
            if (resp.ok) return resp.json();
          })
          .then(json => {
            popup.close();

            res(json.access_token)
          });
      };

      window.addEventListener('message', messageHandler);
    });
  }

  rateLimit() {
    return doAction('rate_limit');
  }

  user(method = 'GET', options = {}) {
    return doAction('user', method, options);
  }

  repo(repo, endpoint, method = 'GET', options = {}) {
    return doAction(`repos/${repo}/${endpoint}`, method, options);
  }
}
