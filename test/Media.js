(function($) {
	/*
    ======== A Handy Little QUnit Reference ========
    http://api.qunitjs.com/

    Test methods:
      module(name, {[setup][ ,teardown]})
      test(name, callback)
      expect(numberOfAssertions)
      stop(increment)
      start(decrement)
    Test assertions:
      ok(value, [message])
      equal(actual, expected, [message])
      notEqual(actual, expected, [message])
      deepEqual(actual, expected, [message])
      notDeepEqual(actual, expected, [message])
      strictEqual(actual, expected, [message])
      notStrictEqual(actual, expected, [message])
      throws(block, [expected], [message])
	 */

	var config1 = {
		apiKey: testApiKey,
		address: testUsers[0].address,
		password: testUsers[0].password,
		displayName: 'Unit Tester #1'
	};
	var config2 = {
		apiKey: testApiKey,
		address: testUsers[1].address,
		password: testUsers[1].password,
		displayName: 'Unit Tester #2',
		onDisconnected: function (event) {
			if (event.status === 'normal') {
				QUnit.start();
			}
			// Otherwise wait for the hung test timeout
		}
	};

	QUnit.module("Media Sessions");

	/*
	 * User 1 attempts to connect to user 2, but user 2 does not have
	 * the necessary event handler defined.
	 */
// TEST DISABLED WHILE SPECIAL 488 ROUTING MAY ATTEMPT ASTERISK CONNECTION
//	QUnit.asyncTest("Connect to user with no onMediaSession handler", 2, function(assert) {
//		var croc1 = $.croc(config1);
//		var croc2 = $.croc(config2);
//		// Give up if the test has hung for too long
//		var hungTimerId = setTimeout(function() {
//			assert.ok(false, 'Aborting hung test');
//			croc1.disconnect();
//			croc2.disconnect();
//		}, 30000);
//
//		// Wait for receiver to register before sending the data
//		croc2.sipUA.on('registered', function () {
//			var session = croc1.media.connect(config2.address);
//			
//			session.onConnecting = function () {
//				assert.ok(true, 'MediaSession.onConnecting event fired');
//			};
//
//			// Clean up the croc objects when the session closes
//			session.onClose = function () {
//				assert.ok(true, 'MediaSession.onClose event fired');
//				clearTimeout(hungTimerId);
//				croc1.disconnect();
//				croc2.disconnect();
//			};
//		});
//
//		// QUnit will restart once the second croc object has disconnected
//	});

	QUnit.asyncTest("Successful audio connection", 15, function(assert) {
		var croc1 = $.croc(config1);
		var croc2 = $.croc(config2);
		// Give up if the test has hung for too long
		var hungTimerId = setTimeout(function() {
			assert.ok(false, 'Aborting hung test');
			croc1.disconnect();
			croc2.disconnect();
		}, 60000);
		var defaultStreams = new CrocSDK.StreamConfig({
			audio: {send: true, receive: true}
		});
		var provisionalFired = false;

		croc2.media.onMediaSession = function (event) {
			var session = event.session;
			assert.ok(true, 'onMediaSession fired');

			// Check the session properties
			assert.strictEqual(session.address, config1.address, 'Expected remote address');
			assert.strictEqual(session.displayName, config1.displayName, 'Expected remote name');
			assert.deepEqual(session.streamConfig, defaultStreams, 'Expected streams');
			assert.deepEqual(session.customHeaders, {}, 'Expected custom headers');
			assert.deepEqual(session.capabilities, croc1.capabilities, 'Expected capabilities');

			// Check that expected events fire
			session.onConnect = function () {
				assert.ok(true, 'callee onConnect fired');
				// Close a fixed time after connecting
				setTimeout(function () {
					assert.ok(true, 'Timer fired - closing session');
					session.close();
				}, 5000);
			};
			session.onRemoteMediaReceived = function () {
				assert.ok(true, 'callee onRemoteMediaReceived fired');
			};
			session.onClose = function () {
				assert.ok(true, 'callee onClose event fired');
			};

			// Accept the session
			session.accept();
		};

		// Wait for receiver to register before sending the data
		croc2.onRegistered = function () {
			var session = croc1.media.connect(config2.address);

			// Check that expected events fire
			session.onConnecting = function () {
				assert.ok(true, 'caller onConnecting fired');
			};
			session.onProvisional = function () {
				// May fire multiple times - only assert once
				if (!provisionalFired) {
					assert.ok(true, 'caller onProvisional fired');
					provisionalFired = true;
				}
			};
			session.onConnect = function () {
				assert.ok(true, 'caller onConnect fired');
			};
			session.onRemoteMediaReceived = function () {
				assert.ok(true, 'caller onRemoteMediaReceived fired');
			};

			// Clean up the croc objects when the session closes
			session.onClose = function () {
				assert.ok(true, 'caller onClose event fired');
				clearTimeout(hungTimerId);
				croc1.disconnect();
				croc2.disconnect();
			};
		};

		// QUnit will restart once the second croc object has disconnected
	});

	QUnit.asyncTest("Send-only audio connection", 12, function(assert) {
		var croc1 = $.croc(config1);
		var croc2 = $.croc(config2);
		// Give up if the test has hung for too long
		var hungTimerId = setTimeout(function() {
			assert.ok(false, 'Aborting hung test');
			croc1.disconnect();
			croc2.disconnect();
		}, 60000);
		var callerStreams = new CrocSDK.StreamConfig({
			audio: {send: true, receive: false}
		});
		var calleeStreams = new CrocSDK.StreamConfig({
			audio: {send: false, receive: true}
		});
		var provisionalFired = false;

		croc2.media.onMediaSession = function (event) {
			var session = event.session;
			assert.ok(true, 'onMediaSession fired');

			// Check the session properties
			assert.strictEqual(session.address, config1.address, 'Expected remote address');
			assert.strictEqual(session.displayName, config1.displayName, 'Expected remote name');
			assert.deepEqual(session.streamConfig, calleeStreams, 'Expected streams');
			assert.deepEqual(session.customHeaders, {}, 'Expected custom headers');
			assert.deepEqual(session.capabilities, croc1.capabilities, 'Expected capabilities');

			// Accept the session, then close after a fixed time
			session.accept();
			setTimeout(function () {
				assert.ok(true, 'Timer fired - closing session');
				session.close();
			}, 15000);
		};

		// Wait for receiver to register before sending the data
		croc2.onRegistered = function () {
			var session = croc1.media.connect(config2.address, {
				streamConfig: callerStreams
			});

			// Check that expected events fire
			session.onConnecting = function () {
				assert.ok(true, 'onConnecting fired');
			};
			session.onProvisional = function () {
				// May fire multiple times - only assert once
				if (!provisionalFired) {
					assert.ok(true, 'onProvisional fired');
					provisionalFired = true;
				}
			};
			session.onConnect = function () {
				assert.ok(true, 'onConnect fired');
				assert.deepEqual(session.streamConfig, callerStreams, 'Expected accept streams');
			};

			// Clean up the croc objects when the session closes
			session.onClose = function () {
				assert.ok(true, 'MediaSession.onClose event fired');
				clearTimeout(hungTimerId);
				croc1.disconnect();
				croc2.disconnect();
			};
		};

		// QUnit will restart once the second croc object has disconnected
	});

	QUnit.asyncTest("Receive-only audio connection", 13, function(assert) {
		var croc1 = $.croc(config1);
		var croc2 = $.croc(config2);
		// Give up if the test has hung for too long
		var hungTimerId = setTimeout(function() {
			assert.ok(false, 'Aborting hung test');
			croc1.disconnect();
			croc2.disconnect();
		}, 60000);
		var callerStreams = new CrocSDK.StreamConfig({
			audio: {send: false, receive: true}
		});
		var calleeStreams = new CrocSDK.StreamConfig({
			audio: {send: true, receive: false}
		});
		var provisionalFired = false;

		croc2.media.onMediaSession = function (event) {
			var session = event.session;
			assert.ok(true, 'onMediaSession fired');

			// Check the session properties
			assert.strictEqual(session.address, config1.address, 'Expected remote address');
			assert.strictEqual(session.displayName, config1.displayName, 'Expected remote name');
			assert.deepEqual(session.streamConfig, calleeStreams, 'Expected streams');
			assert.deepEqual(session.customHeaders, {}, 'Expected custom headers');
			assert.deepEqual(session.capabilities, croc1.capabilities, 'Expected capabilities');

			// Accept the session, then close after a fixed time
			session.accept();
			setTimeout(function () {
				assert.ok(true, 'Timer fired - closing session');
				session.close();
			}, 15000);
		};

		// Wait for receiver to register before sending the data
		croc2.onRegistered = function () {
			var session = croc1.media.connect(config2.address, {
				streamConfig: callerStreams
			});

			// Check that expected events fire
			session.onConnecting = function () {
				assert.ok(true, 'onConnecting fired');
			};
			session.onProvisional = function () {
				// May fire multiple times - only assert once
				if (!provisionalFired) {
					assert.ok(true, 'onProvisional fired');
					provisionalFired = true;
				}
			};
			session.onConnect = function () {
				assert.ok(true, 'onConnect fired');
				assert.deepEqual(session.streamConfig, callerStreams, 'Expected accept streams');
			};
			session.onRemoteMediaReceived = function () {
				assert.ok(true, 'onRemoteMediaReceived fired');
			};

			// Clean up the croc objects when the session closes
			session.onClose = function () {
				assert.ok(true, 'MediaSession.onClose event fired');
				clearTimeout(hungTimerId);
				croc1.disconnect();
				croc2.disconnect();
			};
		};

		// QUnit will restart once the second croc object has disconnected
	});

	QUnit.asyncTest("Reject video stream in accept", 13, function(assert) {
		var croc1 = $.croc(config1);
		var croc2 = $.croc(config2);
		// Give up if the test has hung for too long
		var hungTimerId = setTimeout(function() {
			assert.ok(false, 'Aborting hung test');
			croc1.disconnect();
			croc2.disconnect();
		}, 60000);
		var requestStreams = new CrocSDK.StreamConfig({
			audio: {send: true, receive: true},
			video: {send: true, receive: true}
		});
		var acceptStreams = new CrocSDK.StreamConfig({
			audio: {send: true, receive: true}
		});
		var provisionalFired = false;

		croc2.media.onMediaSession = function (event) {
			var session = event.session;
			assert.ok(true, 'onMediaSession fired');

			// Check the session properties
			assert.strictEqual(session.address, config1.address, 'Expected remote address');
			assert.strictEqual(session.displayName, config1.displayName, 'Expected remote name');
			assert.deepEqual(session.streamConfig, requestStreams, 'Expected request streams');
			assert.deepEqual(session.customHeaders, {}, 'Expected custom headers');
			assert.deepEqual(session.capabilities, croc1.capabilities, 'Expected capabilities');

			// Accept the session, then close after a fixed time
			session.accept(acceptStreams);
			setTimeout(function () {
				assert.ok(true, 'Timer fired - closing session');
				session.close();
			}, 15000);
		};

		// Wait for receiver to register before sending the data
		croc2.onRegistered = function () {
			var session = croc1.media.connect(config2.address, {
				streamConfig: requestStreams
			});

			// Check that expected events fire
			session.onConnecting = function () {
				assert.ok(true, 'onConnecting fired');
			};
			session.onProvisional = function () {
				// May fire multiple times - only assert once
				if (!provisionalFired) {
					assert.ok(true, 'onProvisional fired');
					provisionalFired = true;
				}
			};
			session.onConnect = function () {
				assert.ok(true, 'onConnect fired');
				assert.deepEqual(session.streamConfig, acceptStreams, 'Expected accept streams');
			};
			session.onRemoteMediaReceived = function () {
				assert.ok(true, 'onRemoteMediaReceived fired');
			};

			// Clean up the croc objects when the session closes
			session.onClose = function () {
				assert.ok(true, 'MediaSession.onClose event fired');
				clearTimeout(hungTimerId);
				croc1.disconnect();
				croc2.disconnect();
			};
		};

		// QUnit will restart once the second croc object has disconnected
	});

	QUnit.asyncTest("Forked call, two accepts", 10, function(assert) {
		var croc1 = $.croc(config1);
		var croc2 = $.croc(config2);
		delete croc2.onDisconnected;
		var croc3 = $.croc(config2);
		// Give up if the test has hung for too long
		var hungTimerId = setTimeout(function() {
			assert.ok(false, 'Aborting hung test');
			croc1.disconnect();
			croc2.disconnect();
			croc3.disconnect();
		}, 60000);
		var defaultStreams = new CrocSDK.StreamConfig({
			audio: {send: true, receive: true}
		});
		var provisionalFired = false;
		var forkSessions = [];
		var callerSession;
		var closeRequested = false;
		var closeTimerId = null;
		var earlyOnCloseFired = false;
		var lateOnCloseFired = false;

		croc2.media.onMediaSession = croc3.media.onMediaSession = function (event) {
			var session = event.session;
			forkSessions.push(session);
			var fork = forkSessions.length;
			assert.ok(true, 'onMediaSession fired: fork ' + fork);

			// Check that expected events fire
			session.onConnect = function () {
				if (!closeTimerId) {
					closeTimerId = setTimeout(function () {
						assert.ok(true, 'Timer fired - closing session');
						console.log('Timer fired - closing session');
						callerSession.close();
						closeRequested = true;
					}, 5000);
				}
			};
			session.onClose = function () {
				fork = forkSessions.indexOf(this) + 1;
				if (closeRequested) {
					if (lateOnCloseFired) {
						// Two late closes - fail
						assert.ok(false, 'late onClose event fired: fork ' + fork);
					} else {
						assert.ok(true, 'late onClose event fired: fork ' + fork);
						lateOnCloseFired = true;
					}
				} else {
					if (earlyOnCloseFired) {
						// Two early closes - fail
						assert.ok(false, 'early onClose event fired: fork ' + fork);
					} else {
						assert.ok(true, 'early onClose event fired: fork ' + fork);
						earlyOnCloseFired = true;
					}
				}
			};

			if (fork > 1) {
				forkSessions.forEach(function (session) {
					session.accept();
				});
			}
		};

		// Wait for receiver to register before sending the data
		croc3.onRegistered = function () {
			var session = croc1.media.connect(config2.address, {
				streamConfig: defaultStreams
			});
			callerSession = session;

			// Check that expected events fire
			session.onConnecting = function () {
				assert.ok(true, 'caller onConnecting fired');
			};
			session.onProvisional = function () {
				// May fire multiple times - only assert once
				if (!provisionalFired) {
					assert.ok(true, 'caller onProvisional fired');
					provisionalFired = true;
				}
			};
			session.onConnect = function () {
				assert.ok(true, 'caller onConnect fired');
			};
			session.onRemoteMediaReceived = function () {
				assert.ok(true, 'caller onRemoteMediaReceived fired');
			};

			// Clean up the croc objects when the session closes
			session.onClose = function () {
				assert.ok(true, 'caller onClose event fired');
				clearTimeout(hungTimerId);
				// Wait a couple of seconds before calling disconnect to avoid
				// confusing the source of the BYE requests.
				setTimeout(function () {
					croc1.disconnect();
					croc2.disconnect();
					croc3.disconnect();
				}, 2000);
			};
		};

		// QUnit will restart once the second croc object has disconnected
	});

	QUnit.asyncTest("Simple re-INVITE", 5, function(assert) {
		var croc1 = $.croc(config1);
		var croc2 = $.croc(config2);
		// Give up if the test has hung for too long
		var hungTimerId = setTimeout(function() {
			assert.ok(false, 'Aborting hung test');
			croc1.disconnect();
			croc2.disconnect();
		}, 30000);

		croc2.media.onMediaSession = function (event) {
			var session = event.session;
			assert.ok(true, 'onMediaSession fired');

			// Accept the session
			session.accept();

			// Clean up the croc objects when the session closes
			session.onClose = function () {
				assert.ok(true, 'callee onClose event fired');
				clearTimeout(hungTimerId);
				croc1.disconnect();
				croc2.disconnect();
			};
		};

		// Wait for receiver to register before sending the data
		croc2.onRegistered = function () {
			var session = croc1.media.connect(config2.address);

			session.onConnect = function () {
				assert.ok(true, 'caller onConnect fired');
				// Send a re-INVITE a short while later
				setTimeout(function () {
					// Not intended to be a public method
					session._sendReinvite();
					assert.ok(true, 're-INVITE sent');
				}, 2000);
				// Close a fixed time after connecting
				setTimeout(function () {
					assert.ok(true, 'Timer fired - closing session');
					session.close();
				}, 4000);
			};
		};

		// QUnit will restart once the second croc object has disconnected
	});

	QUnit.asyncTest("Multiple sequential re-INVITEs", 8, function(assert) {
		var croc1 = $.croc(config1);
		var croc2 = $.croc(config2);
		// Give up if the test has hung for too long
		var hungTimerId = setTimeout(function() {
			assert.ok(false, 'Aborting hung test');
			croc1.disconnect();
			croc2.disconnect();
		}, 40000);
		var session1, session2;

		croc2.media.onMediaSession = function (event) {
			session2 = event.session;
			assert.ok(true, 'onMediaSession fired');

			// Accept the session
			session2.accept();

			// Clean up the croc objects when the session closes
			session2.onClose = function () {
				assert.ok(true, 'callee onClose event fired');
				clearTimeout(hungTimerId);
				croc1.disconnect();
				croc2.disconnect();
			};
		};

		// Wait for receiver to register before sending the data
		croc2.onRegistered = function () {
			session1 = croc1.media.connect(config2.address);

			session1.onConnect = function () {
				assert.ok(true, 'caller onConnect fired');
				// Schedule following re-INVITEs
				// Assumes the re-INVITEs are quick (no ICE)
				setTimeout(function () {
					// Not intended to be a public method
					console.log('session2 sending re-INVITE', Date.now());
					session2._sendReinvite();
					assert.ok(true, 're-INVITE 1 sent');
				}, 2000);
				setTimeout(function () {
					// Not intended to be a public method
					console.log('session2 sending re-INVITE', Date.now());
					session2._sendReinvite();
					assert.ok(true, 're-INVITE 2 sent');
				}, 4000);
				setTimeout(function () {
					// Not intended to be a public method
					console.log('session1 sending re-INVITE', Date.now());
					session1._sendReinvite();
					assert.ok(true, 're-INVITE 3 sent');
				}, 6000);
				setTimeout(function () {
					// Not intended to be a public method
					console.log('session1 sending re-INVITE', Date.now());
					session1._sendReinvite();
					assert.ok(true, 're-INVITE 4 sent');
				}, 8000);
				// Close a fixed time after connecting
				setTimeout(function () {
					assert.ok(true, 'Timer fired - closing session');
					session1.close();
				}, 10000);
			};
		};

		// QUnit will restart once the second croc object has disconnected
	});

	QUnit.asyncTest("Hold/Resume", 17, function(assert) {
		var croc1 = $.croc(config1);
		var croc2 = $.croc(config2);
		// Give up if the test has hung for too long
		var hungTimerId = setTimeout(function() {
			assert.ok(false, 'Aborting hung test');
			croc1.disconnect();
			croc2.disconnect();
		}, 40000);
		var requestStreams = new CrocSDK.StreamConfig({
			audio: {send: true, receive: true},
			video: {send: true, receive: true}
		});
		var localHoldStreams = new CrocSDK.StreamConfig({
			audio: {send: true, receive: false},
			video: {send: true, receive: false}
		});
		var remoteHoldStreams = new CrocSDK.StreamConfig({
			audio: {send: false, receive: true},
			video: {send: false, receive: true}
		});
		var numRenegotiations = 0;

		croc2.media.onMediaSession = function (event) {
			var session = event.session;
			assert.ok(true, 'onMediaSession fired');
			assert.deepEqual(session.streamConfig, requestStreams,
					'Expected callee initial streams');

			// Accept the session
			session.accept();

			session.onHold = function () {
				assert.ok(true, 'onHold fired');
				assert.deepEqual(session.streamConfig, remoteHoldStreams,
						'Expected callee hold streams');
				assert.throws(
						function () {
							session.hold();
						}, CrocSDK.Exceptions.StateError,
						'Immediate reverse-hold attempt raises exception');
			};

			session.onResume = function () {
				assert.ok(true, 'onResume fired');
				assert.deepEqual(session.streamConfig, requestStreams,
						'Expected callee resume streams');
			};

			// Clean up the croc objects when the session closes
			session.onClose = function () {
				assert.ok(true, 'callee onClose event fired');
				clearTimeout(hungTimerId);
				croc1.disconnect();
				croc2.disconnect();
			};
		};

		// Wait for receiver to register before sending the data
		croc2.onRegistered = function () {
			var session = croc1.media.connect(config2.address, {
				streamConfig: requestStreams
			});

			session.onConnect = function () {
				assert.ok(true, 'caller onConnect fired');
				assert.deepEqual(session.streamConfig, requestStreams,
						'Expected caller initial streams');
				// Put the call on hold a short while later
				setTimeout(function () {
					session.hold();
					assert.ok(true, 'hold requested');
				}, 2000);
			};

			session.onRenegotiateComplete = function () {
				numRenegotiations++;
				switch (numRenegotiations) {
				case 1:
					assert.ok(true, 'hold successful');
					assert.deepEqual(session.streamConfig, localHoldStreams,
							'Expected caller hold streams');
					// Resume the call a short while later
					setTimeout(function () {
						session.resume();
						assert.ok(true, 'resume requested');
					}, 2000);
					break;
				case 2:
					assert.ok(true, 'resume successful');
					assert.deepEqual(session.streamConfig, requestStreams,
					'Expected caller resume streams');
					// Close the session a short while later
					setTimeout(function () {
						assert.ok(true, 'Timer fired - closing session');
						session.close();
					}, 2000);
					break;
				default:
					assert.ok(false, 'unexpected renegotiation');
					break;
				}
			};
		};

		// QUnit will restart once the second croc object has disconnected
	});

	QUnit.asyncTest("Two-way Hold/Resume", 22, function(assert) {
		var croc1 = $.croc(config1);
		var croc2 = $.croc(config2);
		// Give up if the test has hung for too long
		var hungTimerId = setTimeout(function() {
			assert.ok(false, 'Aborting hung test');
			croc1.disconnect();
			croc2.disconnect();
		}, 60000);
		var requestStreams = new CrocSDK.StreamConfig({
			audio: {send: true, receive: true},
			video: {send: true, receive: true}
		});
		var localHoldStreams = new CrocSDK.StreamConfig({
			audio: {send: true, receive: false},
			video: {send: true, receive: false}
		});
		var remoteHoldStreams = new CrocSDK.StreamConfig({
			audio: {send: false, receive: true},
			video: {send: false, receive: true}
		});
		var bothHoldStreams = new CrocSDK.StreamConfig({
			audio: {send: false, receive: false},
			video: {send: false, receive: false}
		});
		var numRenegotiations = 0;
		var session1, session2;

		croc2.media.onMediaSession = function (event) {
			session2 = event.session;
			assert.ok(true, 'onMediaSession fired');
			assert.deepEqual(session2.streamConfig, requestStreams,
					'Expected callee initial streams');

			// Accept the session
			session2.accept();

			// Clean up the croc objects when the session closes
			session2.onClose = function () {
				assert.ok(true, 'callee onClose event fired');
				clearTimeout(hungTimerId);
				croc1.disconnect();
				croc2.disconnect();
			};
		};

		// Wait for receiver to register before sending the data
		croc2.onRegistered = function () {
			session1 = croc1.media.connect(config2.address, {
				streamConfig: requestStreams
			});

			session1.onConnect = function () {
				assert.ok(true, 'caller onConnect fired');
				assert.deepEqual(session1.streamConfig, requestStreams,
						'Expected caller initial streams');
				// Put the call on hold a short while later
				setTimeout(function () {
					session1.hold();
					assert.ok(true, 'session1.hold requested');
				}, 2000);
			};

			session1.onRenegotiateComplete = function () {
				numRenegotiations++;
				switch (numRenegotiations) {
				case 1:
					assert.ok(true, 'session1.hold successful');
					assert.deepEqual(session1.streamConfig, localHoldStreams,
							'Expected caller hold streams');
					assert.deepEqual(session2.streamConfig, remoteHoldStreams,
							'Expected callee hold streams');
					// Next the other party puts the call on hold
					setTimeout(function () {
						session2.hold();
						assert.ok(true, 'session2.hold requested');
					}, 2000);
					break;
				case 2:
					assert.ok(true, 'session2.hold successful');
					assert.deepEqual(session1.streamConfig, bothHoldStreams,
							'Expected caller hold streams');
					assert.deepEqual(session2.streamConfig, bothHoldStreams,
							'Expected callee hold streams');
					// Next the other party resumes the call
					setTimeout(function () {
						session1.resume();
						assert.ok(true, 'session1.resume requested');
					}, 2000);
					break;
				case 3:
					assert.ok(true, 'session1.resume successful');
					assert.deepEqual(session1.streamConfig, remoteHoldStreams,
							'Expected caller hold streams');
					assert.deepEqual(session2.streamConfig, localHoldStreams,
							'Expected callee hold streams');
					// Next the other party resumes the call
					setTimeout(function () {
						session2.resume();
						assert.ok(true, 'session2.resume requested');
					}, 2000);
					break;
				case 4:
					assert.ok(true, 'session2.resume successful');
					assert.deepEqual(session1.streamConfig, requestStreams,
							'Expected caller hold streams');
					assert.deepEqual(session2.streamConfig, requestStreams,
							'Expected callee hold streams');
					// Close the session a short while later
					setTimeout(function () {
						assert.ok(true, 'Timer fired - closing session1');
						session1.close();
					}, 2000);
					break;
				default:
					assert.ok(false, 'unexpected renegotiation');
					break;
				}
			};
		};

		// QUnit will restart once the second croc object has disconnected
	});

}(jQuery));
