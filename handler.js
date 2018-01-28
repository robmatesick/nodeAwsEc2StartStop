/**
 * This code is intended to be used by triggers (CloudWatch events) to perform
 * sys ops automation.  This can be used to, for example, stop all EC2 instances
 * at the end of the business day and then start them up the next business morning.
 * 
 * Modification History:
 *   DATE        AUTHOR                       DESCRIPTION 
 *   ----------  ---------------------------  ------------------------------------
 *   2018-01-27  rob.matesick@gmail.com       Initial version
 */
'use strict';

const AWS = require('aws-sdk');


/**
 * Returns an array of regions
 * @param {*} Array
 * @return Promise
 */
var mapRegions = (regions) => {
	return regions.map(region => region.RegionName);
}


/**
 * Returns an array of instances from a regions Reservations
 * @param {*} reservations 
 * @param {*} status 
 * @returns Array
 */
var mapInstances = (reservations, status) => {
	var instances = [];
	reservations.forEach(reservation => reservation.Instances.forEach(instance => {
		if (instance.State.Name === status) {
			instances.push(instance.InstanceId);
		}
  }));
	return instances;
}


/**
 * Describes available regions
 * @return Promise
 */
var discoverAvailableRegions = () => {
	const ec2 = new AWS.EC2();

	return new Promise(resolve => ec2.describeRegions({}, (error, response) =>
		resolve(mapRegions(response.Regions))
	));
}


/**
 * Describes available instances in a region
 * @return Promise
 */
var discoverRegionInstances = (region, status) => {
	const ec2 = new AWS.EC2({ region });

	return new Promise(resolve => ec2.describeInstances({}, (error, response) =>
		resolve(mapInstances(response.Reservations, status))
	));
}


/**
 * Performs specified action on instances in all regions within the account
 * @param {*} actionType 
 * @return Promise
 */
var _startStopInstances = (actionType) => {
  let instStatusName = null;

  return new Promise(resolve => {
    if (actionType === 'START') {
      instStatusName = 'stopped';
    }
    else if (actionType === 'STOP') {
      instStatusName = 'running';
    }
    else {
      reject(`Invalid action: ${actionType}`);
    }

    discoverAvailableRegions()
    .then(regions => {
      // NOTE:  Using 'for' (for better performance) here instead of 'Array.forEach'
      for (let i = 0; i < regions.length; i++) {
        let region = regions[i];
        console.log(`INFO:  Processing region ${region}...`);
        discoverRegionInstances(region, instStatusName)
        .then(
          (instances) => {
            if (!instances.length) {
              console.log(`INFO: No valid instances found for region ${region}`);
            }
            else {
              console.log(`DBG: Region '${region}' Instances: ${JSON.stringify(instances, null, 2)}`);
              var ec2 = new AWS.EC2({ region });

              ec2.createTags(
                {
                  Resources: instances,
                  Tags: [{
                    Key: 'NodeAWSEC2StartStop',
                    Value: Date.now().toString()
                  }]
                }, 
                (error, response) => {
                  if (error) resolve(console.log('ERROR creating tags: ' + error, error.stack)); // an error occurred
                  else       resolve(console.log(response));                                     // successful response
                }
              );

              // Alter the state of the instances
              if (actionType === 'START') {
                ec2.startInstances({ InstanceIds: instances }, (error, response) => {
                  if (error) resolve(console.log('ERROR starting instances: ' + error, error.stack)); // an error occurred
                  else       resolve(console.log(response));                                          // successful response
                });
              }
              else if (actionType === 'STOP') {
                ec2.stopInstances({ InstanceIds: instances }, (error, response) => {
                  if (error) resolve(console.log('ERROR stopping instances: ' + error, error.stack)); // an error occurred
                  else       resolve(console.log(response));                                          // successful response
                });
              }

            }
          },
          (error) => {
            resolve(`Unable to discover instances: ${error}`);
          }
        );
        // .catch((err) => {
        //   console.log(`Caught another one! ${err}`);
        // });
      }
    },
    (error) => {
      reject(`Unknown error: ${error}`)      ;
    })
    .catch((err) => {
      console.log(`Caught: ${err}`);
    });

    console.log('Done');
  });
};


/**
 * Stops an array of instances
 * @param {*} event 
 * @param {*} context 
 * @return Promise
 */
var stopInstances = (event, context) => {
  return _startStopInstances('STOP');
};


/**
 * Starts all not-running instances
 * @param {*} event 
 * @param {*} context 
 * @returns Promise
 */
var startInstances = (event, context) => {
  return _startStopInstances('START');
};


// Exports
module.exports = {
  'startInstances': startInstances,
  'stopInstances': stopInstances
};