exports.handler = (event, context) => {
	const admin = require('firebase-admin');
	const db = admin.database();
	const requestKey = context.params.requestKey;

	const requestRef = db.ref('/single-request/'+requestKey);

	const notifyBy = 'state'
	//const notifyBy = 'address'

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
					var tokenArray = [];
					return checkPreferenceUsers(prefUserList, tokenArray, requestSnap);
					
			});
		}
	});
}

function checkPreferenceUsers(prefList, tokenArr, reqSnap){
	const admin = require('firebase-admin');
	const db = admin.database();
	const userRef = db.ref('/users');
	const reqVal = reqSnap.val();
	const reqToken = reqVal.userToken;

	if (!prefList.length){
		return checkTokenArray(tokenArr, reqSnap);
	}
	const prefUserId = prefList.shift();
	db.ref('/users/'+prefUserId).once('value', (userSnap) => {
		if (userSnap.exists()){
			const userVal = userSnap.val();
			var userToken = userVal.token;

			//check if user is logged in
			if ((typeof userToken !== 'undefined') || (userToken !== null)) {
				const preferenceNotification = userVal.preferenceNotification;
				const signedIn = userVal.signedIn;

				//prevent sending notification to the user who created this request
				//check if same token exists in the tokenArray
				//check if user enabled notification
				//check if user is signed in
				if ((reqToken !== userToken) && (tokenArr.indexOf(userToken) === -1) && preferenceNotification && signedIn){
					tokenArr.push(userToken);
				}
			}
		}else{
			console.log('user dne: '+ prefUserId);
		}
		
		checkPreferenceUsers(prefList, tokenArr, reqSnap);
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