const API = require('../utils/api');
const constants = require('../utils/constants');

class APIDocumentation extends API {

    api() {

        const response = {};

        for(const [key, endpoint] of API.endpoints) {

            const
                url = key.split('www/').pop(),
                endFunction = endpoint.prototype[key.split('/').pop()],
                parameters = [];

            if(!endFunction) {

                continue;
            }

            const [firstLine] = endFunction.toString().split('\n');

            let
                start = firstLine.indexOf('({'),
                end = firstLine.indexOf('} = {})');

            start = start != -1 ? start + 2 : start;

            if(start > -1 && end > -1) {

                let functionParameters = firstLine.substring(start, end).split(',');

                for(const functionParameter of functionParameters) {

                    const splitParams = functionParameter.split('=');

                    parameters.push({
                        name : splitParams[0].trim(),
                        default_value : splitParams[1] ? splitParams[1].trim() : null,
                    });
                }
            }

            const endpointObject = {
                endpoint: url,
                url: `https://${this.request.headers.host + constants.base_url}/api/v2/${url}`,
                parameters,
            };

            this.traverse(response, endpointObject.endpoint, endpointObject);
        }

        return response;
    }

    traverse(responseObject, url, endpointObject) {

        const hierarchy = url.split('/');

        if(!responseObject[hierarchy[0]]) {

            responseObject[hierarchy[0]] = {
                name: hierarchy[0],
                endpoints: [],
                children: {}
            }
        }

        if(hierarchy.length === 2) {

            responseObject[hierarchy[0]].endpoints.push({
                name: hierarchy[1],
                ...endpointObject
            })
        }
        else {

            this.traverse(responseObject[hierarchy[0]].children, endpointObject.endpoint.split(`${hierarchy[0]}/`)[1], endpointObject);
        }
    }

}

exports.api = APIDocumentation;