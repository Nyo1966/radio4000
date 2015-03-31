import Ember from 'ember';
import clean from 'radio4000/utils/clean';

export default Ember.Controller.extend({
	didCacheSlug: false,

	cacheSlug: Ember.computed('model.slug', function() {
		this.cachedSlug = this.get('model.slug');
		this.toggleProperty('didCacheSlug');
	}),

	updateImage: Ember.observer('newImage', function() {
		var newImage = this.get('newImage');
		var channel = this.get('model');
		var coverImage = this.get('model.coverImage');

		// if we have no previous image
		if (!coverImage) {
			Ember.debug('Creating channel image.');

			var image = this.store.createRecord('image', {
				src: this.get('newImage'),
				channel: channel
			});

			// save and add it to the channel
			image.save().then(function(image) {
				Ember.debug('Image saved.');

				channel.get('images').addObject(image);
				channel.save().then(function() {
					Ember.debug('Saved channel with image');
				});
			});

		// else if we have an image
		} else {
			Ember.debug('Updating channel image.');

			// and it's not the same one
			if (newImage === coverImage.get('src')) {
				Ember.debug('Stopped updating because it is the same src property');
				return;
			}

			// update it
			coverImage.set('src', newImage);
			channel.save().then(function() {
				Ember.debug('Updated channel image.');
			});
		}
	}),

	// Makes sure the slug is valid e.g. not in use by any other channel
	validateSlug() {
		Ember.debug('Validating slug.');
		var slugIsFree = false;
		var model = this.get('model');
		var slug = model.get('slug');

		// Make sure the new one isn't empty
		if (Ember.isEmpty(slug)) {
			alert("Hey, the URL can't be empty. Please enter the URL you'd like your channel to have. If you have no clue, just enter the title.");
			return false;
		}

		// Clean it
		var newSlug = clean(this.get('model.slug'));

		// get all channels
		var channels = this.store.find('channel');
		channels.then(function(channels) {

			console.log('');
			console.log('all channel slugs:');
			channels.forEach(function(channel) {
				console.log(channel.get('slug'));
			});

			console.log('');
			console.log('testing: ' + newSlug);

			// and find duplicates
			// var duplicates = channels.filter(function(item) {
			// 	console.log(item.get('slug'));
			// 	console.log(newSlug);
			// 	return item.get('slug') === newSlug;
			// });

			var duplicates = channels.filterBy('slug', newSlug);

			// console.log('');
			// console.log('all ('+ duplicates.get('length') +') duplicates:');
			// duplicates.forEach(function(item) {
			// 	console.log(item.get('slug'));
			// });

			// filter out own model
			// var filtered = duplicates.filter(function(item) {
			// 	Ember.debug(item);
			// 	Ember.debug(model);
			// 	return item !== model;
			// });

			// console.log('filtered duplicates:');
			// filtered.forEach(function(duplicate) {
			// 	console.log(duplicate.get('slug'));
			// });

			// if there is only one duplicate (the same channel) it's free!
			if (duplicates.get('length') < 2) {
				slugIsFree = true;
			}

			// 3. Set slug accordingly
			if (slugIsFree) {
				Ember.debug('Setting slug to: ' + newSlug);
				this.send('save');
			} else {
				alert('Sorry, that permalink is taken. Try another one.');
				this.set('slug', ''); // empty slug
			}
		}.bind(this));
	},

	actions: {
		trySave() {
			var slugDidChange = (this.get('cachedSlug') !== this.get('model.slug'));

			// this avoid validating slugs uneccessary (because it's heavy)
			if (slugDidChange) {
				this.validateSlug();
			} else if (this.get('model.isDirty')) {
				this.send('save');
			} else {
				this.send('cancelEdit');
			}
		},

		deleteImage() {
			this.get('model.coverImage').destroyRecord().then(function() {
				Ember.debug('Deleted channel image.');
			});
		},

		// Saves the channel
		save() {
			var channel = this.get('model');
			Ember.debug('channel route save');

			channel.save().then(function() {
				this.transitionToRoute('channel', this.get('model.slug'));
			}.bind(this));
		},

		// used by 'ESC' key in the view
		cancelEdit() {
			this.transitionToRoute('channel', this.get('model'));
		},

		tryDelete() {
			var confirmed = confirm('Are you sure? Your channel will be gone forever - you will lose all your tracks');
			if (confirmed) {
				this.send('deleteChannel');
			}
		},

		// Deletes the channel (definitive)
		deleteChannel() {

			/* Expected behavior
			1- remove reference of privateChannel in user
			   * this will never be automatic because we don't want any reference of the channelPrivate (or public)
			   on the user, since we want the user to be annonymous (no relationship defined)
			2- remove references of privateChannel:
				2a- in all users.privateChannel.favoriteChannels
				2b- in all users.publicChannel.followers
			3- delete publicChannel
			4- delete privateChannel
			*/

			var user = this.get('session.user');
			var channel = this.get('model');

			user.get('channels').then(function(userChannels) {
				console.log('// 1- remove privateChannel reference on user');
				// 1- remove privateChannel reference on user
				userChannels.removeObject(channel);
				user.save().then(function() {
					Ember.debug("privateChannel reference on user was removed");
				});
			}).then(function() {
				console.log("// 2a- remove privateChannel reference other privateChannel.favoriteChannels");
				// 2a- remove privateChannel reference other privateChannel.favoriteChannels
				// channel.get('channelPublic.followers').then(function(favorites) {
				// 	// get all this channel's favorite channels and for each...
				// 	favorites.forEach(function(fav) {
				// 		// remove reference of the privateChannel that is being deleted
				// 		fav.get('favoriteChannels').then(function(following) {
				// 			following.removeObject(channel);
				// 			fav.save().then(function() {
				// 				Ember.debug("channel reference on follower was removed");
				// 			});
				// 		});
				// 	});
				// });
			}).then(function() {
				console.log("// 2b- remove reference privateChannel in all users.publicChannel.followers");
				// 2b- remove reference privateChannel in all users.publicChannel.followers
				// channel.get('favoriteChannels').then(function(favorites) {
				// 	// get all this channel's favorite channels and for each...
				// 	favorites.forEach(function(fav) {
				// 		// remove reference of the privateChannel that is being deleted
				// 		fav.get('channelPublic.followers').then(function(follower) {
				// 			follower.removeObject(channel);
				// 			fav.save().then(function() {
				// 				Ember.debug("channel reference as itself a follower was removed");
				// 			});
				// 		});
				// 	});
				// });
			}).then(function() {
				console.log("// 3- delete publicChannel");
				// 3- delete publicChannel
				// channel.get('channelPublic').then(function(publicChannel){
				// 	publicChannel.destroyRecord();
				// 	Ember.debug("publicChannel was deleted");
				// });
			}).then(function() {
				console.log("// 4- delete privateChannel");
				// 4- delete privateChannel
				// channel.destroyRecord().then(function() {
				// 	Ember.debug("privateChannel was deleted");
				// });
			}).then(function() {
  				console.log("all channel references and model are now deleted");
			});








			// notify our sesion because it's a shortcut
			// @todo with some refactor this shouldn't be necessary
			// this.set('session.userChannel', null);

			// this.transitionToRoute('channels.new');
			// remove it as favorite on all channels
			// channels.then(function(channels) {
			// 	Ember.debug(channels);
			// 	channels.forEach(function(channel) {
			// 		channel.get('favoriteChannels').then(function(favorites) {
			// 			favorites.removeObject(channel);
			// 			if (favorites.get('isDirty')) {
			// 				Ember.debug('is dirty');
			// 				promises.push(favorites.save());
			// 			}
			// 		});
			// 	});
			// }, function() {
			// 	//developer failed to save;
			// 	Ember.warn('Error - could not get channels');
			// });

			// // All favorites have been removed
			// Ember.RSVP.all(promises).then(function() {
			// 	_this.transitionToRoute('channels.new');
			// }, function() {
			// 	Ember.warn('Error - could not resolve all promises');
			// 	//one or more languages failed to save
			// });

		}
	}
});
