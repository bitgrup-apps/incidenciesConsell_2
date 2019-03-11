// JavaScript Document


var api = {

    url: 'https://issueapp.ticmallorca.net/rest/',
    password: 'h^t2N6$ZtI5&T1xjxxv2uGZ7&wQT^aJW7CO329nBPbLHpSPj0U4FaEEG&wqqOtX9z@I2z*xP#5gQEQgIhVCv7p9o&XrV0e2YNbt',
    deviceId: null,
    token: null,
    entity: null,
    issuesLimit: 100,

    init: function () {
        try {
            if(bitgrup.production){
                api.deviceId = device.uuid;
            }else{
                api.deviceId = '8b0e32cf46fcfb14';
            }
        } catch (e) {
            
        }
        api.getConfig();
        //bitgrup.entities.chooseEntity();
    },

    /*########################################################################
     #######################   AUTH    ######################################
     ########################################################################*/
    getConfig: function () {
        dataBase.query('SELECT * FROM CONFIG WHERE ID = ? ', [1], function (result) {
            bitgrup.entities.setConfig(result[0]);
        });
    },

    setToken: function (token) {
        api.token = token;
    },

    access: function (callback) {
        var hola = {test: 'test 1'};
        api.sendTest(hola);
        var today = new Date();
        var year = today.getFullYear();
        var month = today.getMonth() + 1;
        var day = today.getDate();
        var hours = today.getHours();
        var date = year.toString() + month.toString() + day.toString() + '.' + hours.toString();
        var phrase = date + api.password + api.deviceId;
        var sha512 = new Hashes.SHA512;
        // DEVICEDT de TEST
        //var deviceDT = {platform: 'Android', version: '5.1.1', manufacturer: 'samsung', network: 'wifi'};
        if(bitgrup.production){
            var deviceDT = {platform: device.platform, version: device.platform, manufacturer: device.manufacturer, network: bitgrup.getConnection()};
        }else{
            var deviceDT = {platform: 'Desktop', version: 'test', manufacturer: 'test', network: 'wifi'};
        }
        var data = {phrase: sha512.hex(phrase), instance: api.deviceId, device: deviceDT};
        var token = api.send(data, 'POST', 'access');
        api.setToken(token);
        callback(token.token);
    },

    /*########################################################################
     #######################    ISSUES    ####################################
     ########################################################################*/

    getIssues: function (callback) {
        api.access(function (token) {
            var data = 'token=' + token + '&' + 'entityId=' + bitgrup.config.ENTITY_ID + '&' + 'limit=' + api.issuesLimit;
            var resp = api.send(data, 'GET', 'issue');
            //Actualitzam l'estat de totes les incidencies a la BBDD
            if(resp.status){
                bitgrup.issues.list.updateIssues(resp.data, function(){callback();});
            }else{
                callback();
            }
        });
    },

    getIssue: function (id) {
        var data = 'token=' + api.token + '&' + 'id=' + id;
        var resp = api.send(data, 'GET', 'issue/id');
    },

    sendIssue: function (id, issueDt, callback) {
        api.access(function (token) {
            var data = {token: token, entityId: parseInt(id), issue: issueDt};
            var resp = api.sendAjaxIssue(data, 'issue');
            try{
                if(resp.data[0].status == 1){
                    callback(resp.data[0].id);
                }else{
                    callback(0);
                }
            }catch(e){
                console.log('E-API-92', e);
                callback(0);
            }
            
        });
    },

    getImgsIssue: function (issue) {
        var imgs = new Array();
        $(issue.IMGS).each(function (i) {
            var img = issue.IMGS[i];
            imgs.push({name: api.deviceId + '_' + issue.ID + '_i', format: 'base64', height: 0, width: 0, data: img});
        });
        return imgs;
    },

    /*########################################################################
     #######################    ENTITIES    ##################################
     ########################################################################*/


    getEntities: function (callback) {
        api.access(function (token) {
            var data = 'token=' + token;
            var entities = api.send(data, 'GET', 'entity');
            callback(entities.data);
        });
    },

    getEntity: function (entityId, callback) {
        api.access(function (token) {
            var data = 'token=' + token + '&' + 'entityId=' + entityId;
            api.entity = api.send(data, 'GET', 'config');
            callback(api.entity.data);
        });
    },

    /*#######################    SEND    ##################################*/


    send: function (data, type, uri) {
        var statusSpinner = bitgrup.spinner.status;
        var json = JSON.stringify(data);
        var response = false;
        if (type === 'GET') {
            $.ajax({
                type: type,
                url: api.url + uri + '?' + data,
                dataType: "json",
                async: false,
                beforeSend: function () {
                    if(!statusSpinner){
                        bitgrup.spinner.on();
                    }
                },
                complete: function () { 
                    if(!statusSpinner){
                        bitgrup.spinner.off();
                    }
                },
                success: function (resposta) {
                    if(bitgrup.production == 0){
                        console.log('GET',resposta);
                    }
                    response = resposta;
                },
                error: function (e) {
                    console.log(e);
                },
                timeout: 3000
            });
        } else {
            $.ajax({
                type: type,
                url: api.url + uri,
                data: json,
                dataType: "json",
                async: false,
                contentType: "application/json; charset=utf-8",
                beforeSend: function () {
                    if(!statusSpinner){
                        bitgrup.spinner.on();
                    }
                },
                complete: function () {
                    if(!statusSpinner){
                        bitgrup.spinner.off();
                    }
                },
                success: function (resposta) {
                    if(bitgrup.production == 0){
                        console.log('POST',resposta);
                    }
                    response = resposta;
                },
                error: function (e) {
                    console.log(e);
                },
                timeout: 3000
            });
        }
        return response;
    },
    
    sendAjaxIssue: function(data, uri){
        var json = JSON.stringify({issue:data.issue});
        var response = false;
        $.ajax({
                type: 'POST',
                url: api.url + uri + '?token=' + data.token + '&entityId=' + data.entityId,
                data: json,
                dataType: "json",
                async: false,
                contentType: "application/json; charset=utf-8",
                beforeSend: function () {
                    bitgrup.spinner.on();
                },
                complete: function () { 
                    bitgrup.spinner.off();
                },
                success: function (resposta) {
                    console.log('RESP NEW ISSUE: ',resposta);
                    response = resposta;
                },
                error: function (e) {
                    console.log(e);
                },
                timeout: 3000
            });
        return response;
    },
    
    sendTest: function(data){
        var json = JSON.stringify(data);
        var response = false;
        $.ajax({
                type: 'POST',
                url: 'https://www.bitgrup.com/test.php',
                data: json,
                dataType: "json",
                async: false,
                contentType: "application/json; charset=utf-8",
                success: function (resposta) {
                    console.log(resposta);
                },
                error: function (e) {
                    console.log(e);
                },
                timeout: 3000
            });
        return response;
    }
}


