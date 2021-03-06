/**
 * Serverside feeder for grabbing facebook data and saving it into local storage
 *
 * @see extended permissions docs: http://developers.facebook.com/docs/authentication/permissions
 * this is what gets passed as 'perms' in FB.login
 *
 * @see graph api docs: http://developers.facebook.com/docs/api
 * used in the FB.api('/me/*...   
 */

window.fbAsyncInit = function() {
    // TEMPORARY
    return false;

    var parent = Atomate.auth;
    FB.init({
	        appId: 122681067752275, //223573334338274;
		status: true, 
		cookie: true, 
		xfbml: true, 
		scope:"user_events,read_mailbox,read_friendlists,user_events"});
    FB.login(function(response) {
		         if (response.session) {
		             if (response.perms) {

			             parent.logProgress('logged in and about to start saving Facebook data');
			             console.log("logged in perms", response.perms);

			             FB.api('/me/friends', function(response) {
				                    if (response.data !== undefined){
					                    var toSave = response.data.length;
					                    var saved = 0;
					                    
									    parent.logProgress('saving ' + toSave + ' people\'s Facebook profile');

					                    parent.interval_map_lite(response.data, function(entry) { 
							                             FB.api('/' + entry.id, function(response) {
								                                    if (response !== undefined){
									                                    //parent.logProgress('saving ' + response.name + '\'s Facebook profile');
									                                    Atomate.auth.Facebook.saveFriend(response); 
								                                    }
								                                    saved++;
								                                });
						                             });
				                    }				    
				                });
			             FB.api('/me/events', function(response) {
				                    if (response.data !== undefined){
					                    try {
					                        parent.logProgress('saving ' + response.data.length + ' facebook events');
					                        parent.interval_map_lite(response.data, function(entry) { Atomate.auth.Facebook.saveEvent(entry); });
					                    } catch(x) { console.log(x); }
				                    }
				                });
			             
			             FB.api('/me/inbox', function(response) {
				                    if (response.data !== undefined){
					                    parent.logProgress('saving ' + response.data.length + ' facebook messages');					                    
					                    parent.interval_map_lite(response.data, function(entry) { Atomate.auth.Facebook.saveMessage(entry); });
				                    }
				                });

                         /*			             
			             FB.api('/me/feed', function(response) {
				                    if (response.data !== undefined){
					                    parent.logProgress('saving ' + response.data.length + ' facebook feed items');					                    
					                    parent.interval_map_lite(response.data, function(entry) { Atomate.auth.Facebook.saveFeedEntry(entry); });
				                    }
				                });
			             */
                         /*
			             FB.api('/me/albums', function(response) {
                                    // not working 
				                    console.log("your albums", response); 
				                    response.data.map(function(album){ 
				                                          FB.api('/' + album.id, function(photo_response) {
				                                                     if (response !== undefined) {
			                                                             console.log('photo_response');
			                                                             console.log(photo_response);
				                                                         parent.logProgress('saving ' + photo_response + ' facebook photos from album ' + album.id);
				                                                         parent.interval_map_lite(photo_response.data, function(entry) { Atomate.auth.Facebook.savePhoto(entry, album); });
				                                                     }
				                                                 });
				                                      });
				                });
                          */
		             } else {
			             // user is logged in, but did not grant any permissions
			             parent.logProgress('<li>you did not grant permission for the Feeder</li>');
		             }
		         } else {
		             console.log("not logged in ");		
		         }
                 //user_photos,user_birthday,friends_birthday,user_relationships,friends_relationships, user_status,friends_status,read_stream,
	         }, {perms:'user_events,read_mailbox,read_friendlists,user_events'});
};

Atomate.auth.Facebook =  {
    parent: Atomate.auth,
    savePhoto: function(entry) {
        // STILL TESTING
        console.log(entry);
        var start = entry.updated_time ? new Date(entry.updated_time.substring(0,entry.updated_time.length - 5)).valueOf() : new Date().valueOf();    
        
        this.parent.saveItem({
			                 type:"schemas.Photo",
			                 id : p.id,
			                 name: p.title._content,
			                 source: "facebook",
			                 'date uploaded':this.parent.makeSpecificDateTime(start),
			                 'created time': this.parent.makeSpecificDateTime(start),
			                 'user id': p.owner.nsid,
			                 username: p.owner.username,
			                 location: p.owner.location,
			                 description: p.description._content,
			                 person: {fbid: entry.from.id }
		                 });

    },

    saveFeedEntry: function(entry) {
        var start = entry.updated_time ? new Date(entry.updated_time.substring(0,entry.updated_time.length - 5)).valueOf() : new Date().valueOf();
        this.parent.saveItem({
			                 id: "facebook_status" + entry.id,
		                         type:"schemas.StatusUpdate",
			                 text: entry.description,
			                 sender: {fbid: entry.from.id},
			                 link: entry.link,
			                 icon: entry.icon,
			                 name: entry.name,
			                 picture: entry.picture,
		                     'status type': entry.type,
			                 'created time': this.parent.makeSpecificDateTime(start)					  
		                 });
    },


    saveFriend: function(entry) {
        var start = entry.updated_time ? new Date(entry.updated_time.substring(0,entry.updated_time.length - 5)).valueOf() : new Date().valueOf();
        this.parent.saveItem({
			                 type:'schemas.Person',
			                 id: entry.id,
			                 fbid: entry.id,
			                 'first name': entry.first_name,
			                 'last name': entry.last_name,
			                 about: entry.about,
			                 gender: entry.gender,
			                 'facebook url': entry.link,
			                 url: entry.website,
			                 timezone: entry.timezone,
			                 'relationship status': entry.relationship_status,			 
			                 'last updated': this.parent.makeSpecificDateTime(start),
			                 birthday: entry.birthday // NOTE: this needs to be parsed -- issue: it seems to return inconsistent date formats

			                 // TODO: add location, hometown, work, education and relationships
		                 });
    },


    saveEvent: function(entry) {
        if (entry && entry.start_time && entry.end_time) {
            var start = new Date(entry.start_time.substring(0,entry.end_time.length - 5)).valueOf();
            var end = new Date(entry.end_time.substring(0,entry.end_time.length - 5)).valueOf();
            
            this.parent.saveItem({
			                         type:"schemas.Event",
			                         id: entry.id,
			                         name: entry.name,
			                         source: 'Facebook',
			                         "start time": this.parent.makeSpecificDateTime(start),
			                         "end time": this.parent.makeSpecificDateTime(end),
			                         location: entry.location
		                         });
        }
    },

    saveMessage: function(entry) {
        // filtering out messages from facebook events
        if (entry && entry.from && 'star_time' in entry.from){
            var start = new Date(entry.updated_time.substring(0,entry.updated_time.length - 5)).valueOf();
            
            this.parent.saveItem({
			                         type:"schemas.Email",
			                         id: entry.id,
			                         source: 'Facebook',
			                         subject: entry.subject, 
			                         message: entry.message, 
			                         "sent time": this.parent.makeSpecificDateTime(start),
			                         sender: {fbid: entry.from.id }
		                         });
        }    
    }
};