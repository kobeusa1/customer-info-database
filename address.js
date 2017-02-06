'use strict';

console.log('loading function');

var AWS = require('aws-sdk');
var dynamo = new AWS.DynamoDB.DocumentClient();

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

    // callback(null, event.operation);
    console.log("In handler");
    console.log("handler: event = " + JSON.stringify(event));
    console.log("handler: context = " + JSON.stringify(context));
    
    var operation = event.operation;
    
    switch (operation) {
        case 'create':
            createCustomer(event, theCallback, callback, context);
            break;
        case 'read':
            getCustomer(event, theCallback, callback);
            break;
        case 'update':
            updateCustomer(event, theCallback, callback);
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

function getCustomer(event, callback1, callback2) {
    var data = event.Item;
    var key = event.Key;
    var params = { 
        TableName : 'Address',
        Key: {"Delivery_Point_Barcode" : key.Delivery_Point_Barcode}        
        };

	console.log("In getCustomer, params = " + JSON.stringify(params));

	dynamo.get(params, function(err, data){
	    if (err) {
            var myErrorObj = {
                    errorType : "Bad Request",
                    httpStatus : 404,
                    requestId : context.awsRequestId,
                    message : "Address not found."
                }
            callback2(JSON.stringify(myErrorObj));
            return;
	    }else{
	        console.log("Get customer success, data = " + JSON.stringify(data));
	        callback1(null, data, callback2);
	    }
	});
}

function createCustomer(event, callback1, callback2, context){
    var data = event.Item;
    var key = event.Key;

    if (data.hasOwnProperty("Delivery_Point_Barcode")) {
        console.log("Invalid Delivery_Point_Barcode.");
        var myErrorObj = {
                errorType : "Bad Request",
                httpStatus : 400,
                requestId : context.awsRequestId,
                message : "Undefined key."
            }
        callback2(JSON.stringify(myErrorObj));
        return;
    }

    if(!isvalidZip(data.zip_code)) {
        var myErrorObj = {
                errorType : "Bad Request",
                httpStatus : 400,
                requestId : context.awsRequestId,
                message : "Zip code invalid."
            }
        callback2(JSON.stringify(myErrorObj));
    	return;
    }

    var params = {
        TableName : "Address",
        Key: {"Delivery_Point_Barcode" : key.Delivery_Point_Barcode}  
      
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
                        message : "Address already existed."
                    }
                callback2(JSON.stringify(myErrorObj));
                console.log("Address has already existed!");
                return;
            } else {  
                    var data1 = event.Item;
                    var key1 = event.Key;
                    var par = {
                        TableName : "Address",
                        Item: {
                            "Delivery_Point_Barcode" : key1.Delivery_Point_Barcode,
                            "city": data1.city,
                            "street": data1.street,
                            "zip_code": data1.zip_code,
                            "add_num": data1.add_num
                        }        
                    };

                    dynamo.put(par, function(err, data1) {
                        if (err) {
                            // context.fail('ERROR: Dynamo failed: ' + err);
                            var myErrorObj = {
                                    errorType : "Bad Request",
                                    httpStatus : 404,
                                    requestId : context.awsRequestId,
                                    message : "Address not found."
                                }
                            callback2(JSON.stringify(myErrorObj));
                            console.error("Unable to create item. Error JSON:", JSON.stringify(err, null, 2));
                        } else {
                            console.log('Dynamo Success: ' + JSON.stringify(data, null, '  '));
                            context.succeed('SUCCESS');
                            callback2(null, "Success");
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

function isvalidZip(zip_code) {
    console.log(zip_code);
    if (zip_code.length != 5) {
        return false;
    }
    for (var i = 0; i < zip_code.length; i++) {
        if (zip_code.charAt(i) - '0' < 0 || zip_code.charAt(i) - '9' > 0) {
            console.log(zip_code.charAt(i));
            console.log(zip_code.charAt(i) - '0');
            return false;
        }
    }
    return true;
}

function deleteCustomer(event, callback1, callback2, context){
    var data = event.Item;
    var key = event.Key;
    var params = {
        TableName : "Address",
        Key: {"Delivery_Point_Barcode" : key.Delivery_Point_Barcode}
    };
    console.log("Attempting a conditional delete...");
    dynamo.delete(params, function(err, data) {
        if (err) {
            var myErrorObj = {
                    errorType : "Bad Request",
                    httpStatus : 404,
                    requestId : context.awsRequestId,
                    message : "Address not found."
                }
            callback2(JSON.stringify(myErrorObj));
            console.log("Address not found.");
        } else {
            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
            callback2(null, "SUCCESS");
        }
    });
}
    
function updateCustomer(event, callback1, callback2, context){
    var data = event.Item; 
    var key = event.Key; 
    var params = {
            TableName : "Address",
        // KeyConditionExpression: "#email = data.email"
            Key: {"Delivery_Point_Barcode" : key.Delivery_Point_Barcode},
        };
        
    if (!key.hasOwnProperty("Delivery_Point_Barcode")) {
        var myErrorObj = {
                errorType : "Bad Request",
                httpStatus : 400,
                requestId : context.awsRequestId,
                message : "Missing field address."
            }
        callback2(JSON.stringify(myErrorObj));      
        console.log("Invalid Address.");
        return;
    }
    if(!data.hasOwnProperty("zip_code") || !isvalidZip(data.zip_code)) {
            var error = {
                    errorType : "Bad Request",
                    httpStatus : 400,
                    requestId : context.awsRequestId,
                    message : "Invalid zip code."
                }
        callback2(JSON.stringify(error));   
    	return;
    }

    dynamo.get(params, function(err, data){
        if (err) {
            // console.log ("Undefined key");
            var myErrorObj = {
                    errorType : "Bad Request",
                    httpStatus : 400,
                    requestId : context.awsRequestId,
                    message : "Undefined key."
                }
            callback2(JSON.stringify(myErrorObj));
            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
            // callback1(err, null, callback2);
        }else{
            if(!isEmpty(data)){
                var data1 = event.Item;
                var key1 = event.Key;
                var par = {
                    TableName : "Address",
                    Key: {"Delivery_Point_Barcode" : key1.Delivery_Point_Barcode},
                    UpdateExpression : "SET add_num = :add_num, zip_code = :zip_code, street = :street, city = :city",
                    // ConditionExpression : "not contains ()"

                    ExpressionAttributeValues: {
                        ":city" : data1.city,
                        ":zip_code" : data1.zip_code,
                        ":street" : data1.street,
                        ":add_num" : data1.add_num
                    }             
                };
                dynamo.update(par,function(err, data1) {
                        if (err) {
                            var myErrorObj = {
                                    errorType : "Bad Request",
                                    httpStatus : 404,
                                    requestId : context.awsRequestId,
                                    message : "Address not found."
                                }
                            callback2(JSON.stringify(myErrorObj));
                            console.error("Unable to Update item. Error JSON:", JSON.stringify(err, null, 2));
                        } else {
                            console.log('Dynamo Success: ' + JSON.stringify(data, null, '  '));
                            callback2(null, "SUCCESS");
                        }
                });              

            } else {  
                var myErrorObj = {
                    errorType : "Not Found",
                    httpStatus : 404,
                    requestId : context.awsRequestId,
                    message : "Address doesn't exist. Request invalid."
                }
                callback2(JSON.stringify(myErrorObj));               
                console.log("Address doesn't exist!");
                               
            }    
        }
    });
}