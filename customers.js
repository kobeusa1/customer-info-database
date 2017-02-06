'use strict';

console.log('loading function');

var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();
var tablename = "contosocustomers";
var host = "https://t2117bz8bc.execute-api.us-east-1.amazonaws.com/test/"

function theCallback(err, data, callback){
    console.log("getCustomer:Before callback");
    
    if (data) {
        //callback(null, JSON.stringify(data));
        callback(null, data);
        console.log("theCallback: data = " + JSON.stringify(data));
    }
    if (err) {
        callback(err, null);
        console.log("theCallback: failure = " + JSON.stringify(err));
    }
}

exports.handler = function(event, context, callback) {

    //callback(null, event.operation); //this callback prevent the error code
    console.log("In handler");
    console.log("handler: event = " + JSON.stringify(event));
    console.log("handler: context = " + JSON.stringify(context));
    
    var operation = event.operation;
    
    switch (operation) {
        case 'create':
            createCustomer(event, theCallback, callback, context);
            break;
        case 'read':
            getCustomer(event, theCallback, callback, context);
            break;
        case 'update':
            updateCustomer(event, theCallback, callback, context);
            break;
        case 'delete':
            deleteCustomer(event, theCallback, callback);
            break;
        // case 'find':
        //     findCustomer(payload, callback);
        //     break;
        case 'ping':
            callback(null, event);
            break;
        default:
            
            callback(new Error('Unrecognized operation  "${event.operation}"'));
    }
};

function getCustomer(event, callback1, callback2, context) {
    console.log(" get in");
    var data = event.Item;
    var key = event.Key;
    console.log(data.email);
    var params = { 
        TableName : tablename,
        Key: {"email" : key.email}        
        };

    console.log("In getCustomer, params = " + JSON.stringify(params));

    dynamo.get(params, function(err, data){
        if (err) {
            console.log ("Error = " + JSON.stringify(err));
            callback1(err, null, callback2);
        }else{
            if(isEmpty(data)){
                var myErrorObj = {
                    errorType : "Not Found",
                    httpStatus : 404,
                    requestId : context.awsRequestId,
                    message : "Customer doesn't exist."
                }
               callback2(JSON.stringify(myErrorObj));
           

            } else {
                if( data.Item.address ) {
                    data.Item.address = {
                        "href" : host + "/Address/" + data.Item.address
                    }
                    data.Item.self = {
                        "href" : host + "/customers/" + data.Item.email
                    }
                }
                console.log("Get customer success, data = " + JSON.stringify(data));
                callback1(null, data, callback2);

            }
        
        
    }
});
}

function isvalidNum(phone_number) {
    console.log(phone_number);
    if (phone_number.length != 10) {
        return false;
    }
    for (var i = 0; i < phone_number.length; i++) {
        if (phone_number.charAt(i) - '0' < 0 || phone_number.charAt(i) - '9' > 0) {
            console.log(phone_number.charAt(i));
            console.log(phone_number.charAt(i) - '0');
            return false;
        }
    }
    return true;
}

function isvalidEmail(email) {
    console.log(email);
    return email.includes("@");
}

function createCustomer(event, callback1, callback2, context){
    var data = event.Item;
    var key = event.Key;

    if (!key.hasOwnProperty("email") || !isvalidEmail(key.email)) {
        var myErrorObj = {
                errorType : "Bad Request",
                httpStatus : 400,
                requestId : context.awsRequestId,
                message : "Undefined key."
            }
        callback2(JSON.stringify(myErrorObj));
        return;
    }

    if (data.hasOwnProperty("phone_number")) {
        if (!isvalidNum(data.phone_number)) {
            var myerror = {
                    errorType : "Bad Request",
                    httpStatus : 400,
                    requestId : context.awsRequestId,
                    message : "Invalid phone number."
                }
            callback2(JSON.stringify(myerror));
            return;
        }
    }
    var params = {
        TableName : tablename,
        Key: {"email" : key.email}  
      
    };

    dynamo.get(params, function(err, data){
        if (err) {
            console.log ("Undefined key");
            callback1(err, null, callback2);
        }else{
            if(!isEmpty(data)){
                var myErrorObj = {
                        errorType : "Bad Request",
                        httpStatus : 400,
                        requestId : context.awsRequestId,
                        message : "Customer already existed."
                    }
                callback2(JSON.stringify(myErrorObj));
                console.log("Customer has already existed!");
                return;
            } else {  
                    var data1 = event.Item;
                    var key1 = event.Key;
                    var par = {
                        TableName : tablename,
                        Item: {
                            "email" : key1.email,
                            "address": data1.address,
                            "firstname": data1.firstname,
                            "lastname": data1.lastname,
                            "phone_number": data1.phone_number
                        }        
                    };

                    dynamo.put(par, function(err, data1) {
                        if (err) {
                            context.fail('ERROR: Dynamo failed: ' + err);
                        } else {
                            callback2(null, "SUCCESS");
                            console.log('Dynamo Success: ' + JSON.stringify(data, null, '  '));
                            context.succeed('SUCCESS');
                        }
                    });
            }    
        }
    });
}

function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop)){
            return false;
        }
    }
    return true;
}
function deleteCustomer(event, callback1, callback2, context){
    var data = event.Item;
    var params = {
        TableName : tablename,
        Key: {"email" : data.email}
    };
    console.log("Attempting a conditional delete...");
    dynamo.delete(params, function(err, data) {
        if (err) {
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
        }
    });
    callback2(null, "success");
}
    
function updateCustomer(event, callback1, callback2, context){
    var data = event.Item;  
    var key = event.Key;
    var params = {
            TableName : tablename,
        // KeyConditionExpression: "#email = data.email"
            Key: {"email" : key.email},
        };

    if (!key.hasOwnProperty("email") || !isvalidEmail(key.email)) {
        var myErrorObj = {
                errorType : "Bad Request",
                httpStatus : 400,
                requestId : context.awsRequestId,
                message : "Missing field email."
            }
        callback2(JSON.stringify(myErrorObj));      
        console.log("Invalid email.");
        return;
    }
    if(!data.hasOwnProperty("phone_number") || !isvalidNum(data.phone_number)){
            var error = {
                    errorType : "Bad Request",
                    httpStatus : 400,
                    requestId : context.awsRequestId,
                    message : "Invalid phone number."
                }
        callback2(JSON.stringify(error));      
        return;        
    }

    dynamo.get(params, function(err, data){
        if (err) {
                var myErrorObj = {
                    errorType : "Bad Request",
                    httpStatus : 400,
                    requestId : context.awsRequestId,
                    message : "Undefined key."
                }
            callback2(JSON.stringify(myErrorObj));
            console.log ("Undefined key");
 
        }else{
            if(!isEmpty(data)){
                var data1 = event.Item;
                var key1 = event.Key;
                var par = {
                    TableName : tablename,
                    Key: {"email" : key1.email},
                    UpdateExpression : "SET phone_number = :num, lastname = :lname, firstname = :fname, address = :address",
                    // ConditionExpression : "not contains ()"

                    ExpressionAttributeValues: {
                        ":address" : data1.address,
                        ":lname" : data1.lastname,
                        ":fname" : data1.firstname,
                        ":num" : data1.phone_number
                    }             
                };
                dynamo.update(par,function(err, data1) {
                        if (err) {
                            console.log('ERROR: Dynamo failed: ' + err);
                        } else {
                            callback2(null, "Success");
                            console.log('Dynamo Success: ' + JSON.stringify(data, null, '  '));
                        }
                });
                

            } else {  
                var errorhere = {
                    errorType : "Bad Request",
                    httpStatus : 404,
                    requestId : context.awsRequestId,
                    message : "You are trying to update customer that doesn't exist."
                }
                callback2(JSON.stringify(errorhere));
                console.log("Customer doesn't exist!");
                   
            }    
        }
    });
}