exports.handler = (event, context) => {
	const admin = require('firebase-admin');
	const db = admin.database();
	const requestKey = context.params.requestKey;

	const requestRef = db.ref('/single-request/'+requestKey);

	/*determines whether to send notification by users in the matching state, or matching city*/
	const notifyBy = 'state'
	//const notifyBy = 'address'

	var tokens = [];

	var onComplete = function(reqSnap) {
	    checkTokenArray(tokens, reqSnap);
	    context.status(200).end();
	    return;
	};

	return requestRef.once('value', (requestSnap) => {
		if (!requestSnap.exists()){
			return;
		}else{
			const requestVal = requestSnap.val();
		
			const requestLookingFor = requestVal.lookingFor;
			const requestToken = requestVal.userToken;
			const address = requestVal.address;

			const fields = address.split(', ');
			const city = fields[0];
			const state = fields[1];
			const country = fields[2];

			var preferenceRef;
			if (requestLookingFor === 'Anyone'){
				if (notifyBy === 'state'){
					preferenceRef = db.ref('/preferenceByState/'+state)
				}else{
					preferenceRef = db.ref('/userPreference/location/'+address)
				}
			}else{
				if (notifyBy === 'state'){
					preferenceRef = db.ref('/preferenceByState/'+state).orderByChild('gender').equalTo(requestLookingFor);
				}else{
					preferenceRef = db.ref('/userPreference/location/'+address).orderByChild('gender').equalTo(requestLookingFor);
				}
			}
			
			return preferenceRef.once('value', (prefUserSnap) => {
					const prefUserList = snapshotToArray(prefUserSnap);
					var tasksToGo = prefUserList.length;

					prefUserList.forEach((user) => {
						getUserToken(user, requestToken).then((result) => {
							//if token already exists in tokens array do not push
							if (tokens.indexOf(result) === -1){
								tokens.push(result);
							}
							//if all users are checked
							if (--tasksToGo === 0){
								onComplete(requestSnap);
							}
							return;
						}).catch((err) => {
							if (err){
								--tasksToGo;
							}
						});
					});	
			});
		}
	});
}

function getUserToken(userId, reqToken) {
	const admin = require('firebase-admin');
	const db = admin.database();
	const userRef = db.ref('/users');

	return new Promise(function(resolve, reject){
		db.ref('/users/'+userId).once('value', (userSnap) => {
			if (userSnap.exists()){
				const userVal = userSnap.val();
				var userToken = userVal.token;

				if ((typeof userToken !== 'undefined') || (userToken !== null)) {
					const preferenceNotification = userVal.preferenceNotification;
					const signedIn = userVal.signedIn;

					if ((reqToken === userToken)){
						reject(new Error("request is created by this user"));
					}else if (!preferenceNotification){
						reject(new Error("user is not receiving preference notification"));
					}else if (!signedIn){
						reject(new Error("user is not signed in"));
					}else{
						resolve(userToken);
					}

				}else{
					reject(new Error("user does not have push notification token"));
				}
			}else{
				reject(new Error("user does not exist in db"));
			}
		});
	});
}

function checkTokenArray(tokenArr, reqSnap){
	if (tokenArr.length > 0){
		const payload = {
				notification: {
					title: 'Title',
					body: 'Body',
					sound: 'default'
				}, 
				data: {
					type: "preference"
				}
		};
		return sendNotifications(payload, tokenArr);
	}else{
		return;
	}
}

function sendNotifications(payload, tokenArr){
	const admin = require('firebase-admin');
	const sendToDevice = admin.messaging().sendToDevice(tokenArr, payload);
	return Promise.all([sendToDevice])
}

function snapshotToArray(snapshot) {
    var returnArr = [];

    snapshot.forEach((child) => {
        var key = child.key;

        returnArr.push(key);
    });

    return returnArr;
}