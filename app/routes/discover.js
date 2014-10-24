import Ember from 'ember';

export default Ember.Route.extend({
	afterModel: function(model) {
		document.title = 'Discover Radio4000';
	},
	deactivate: function() {
		document.title = 'Radio4000';
	}
});