import React, { Component } from 'react';
import PropTypes from 'prop-types';

export default class Sidebar extends Component {
    state = {
        searchBy: false,
        searchErrMsg: ''
    }
    placeSearchService = null;
    geocoder = null;

    componentDidMount() {
        const status =  this.props.google.maps.places.PlacesServiceStatus.OK;
        if (!status) {
            this.props.alertError("Place search is not ready!");
            return;
        }

        this.placeSearchService = new this.props.google.maps.places.AutocompleteService();
        this.geocoder = new this.props.google.maps.Geocoder();
    }

    /* When press enter, handles the search */
    handleKeyPressSearch = e => {
        if (e.charCode === 13){ 
            this.search();
        }
    }

    search = () => {
        const searchInputEl = document.querySelector("input[name=search]");
        const searchBy = searchInputEl.value;

        /* If search field is empty show alert */
        if (!searchBy) {
            this.props.alertError("Please provide search parameter");
            return;
        }
        // Get list of places from google apis
        this.getPlaces(searchBy, (places) => {
            // for each places find details such as coordinates
            this.createMarkers(places, (receivedMarkers, errorCount) => {
                document.querySelector("input[name=filter]").value = "";
                const receivedAmount = receivedMarkers.length;

                if (receivedAmount === 0) {
                    // We didn't get any results
                    this.props.alertError('Error fetching places!')
                } else if (receivedAmount  < places.length) {
                    // We got few results
                    this.props.alertError('Some places were omitted due to error!')
                }
                // We display our received results
                this.props.updateMarkers(receivedMarkers);
            });
        });
    }

    /**
     * Query details like coordinates from google api. 
     * Create marker combining the details
     * @param {Array} places Places retrieved form google api
     */
    createMarkers(places, cb) {
        const _markers = [];
        const waitingResults = places.length;
        let receivedResults = 0;

        places.forEach((place) => {
            // Google has query limit.
            this.geocoder.geocode({
                'placeId': place.place_id
            }, (results, status) => {
                if (status === "OK") {
                    const placeDetails = results[0];
                    /* When getting data from API assign them to variable names that match the required data for Marker component */
                    const marker = {
                        id: place.place_id,
                        position: {
                            lat: placeDetails.geometry.location.lat(),
                            lng: placeDetails.geometry.location.lng(),
                        },
                        name: place.description,
                        title: placeDetails.formatted_address,
                        types: placeDetails.types
                    }
                    _markers.push(marker);
                } else {
                    console.error("Invalid status", status, results);
                }

                // Increment received
                receivedResults++;
                // Check if we got all results
                if (receivedResults === waitingResults) {
                    cb(_markers);
                }
            });
        });
    }

    getPlaces(searchBy, cb) {
        this.placeSearchService.getPlacePredictions({ input: searchBy }, (data, status) => {
            if (status !== "OK") {
                this.props.alertError(`${searchBy} not found! Please try another search!`, 'error');
                console.log(`getPlacesApi: ${searchBy} Not found!`);
                return;
            }

            cb(data);
        });
    }

    /* Filter the default list or list which getting from search according to input value */
    filterList = (event, places) => {
        const filterInputEl = document.querySelector("input[name=filter]");
        const filterBy = filterInputEl.value.toLowerCase();

        /* If filter field is empty show alert */
        if (!filterBy) {
            this.props.alertError('Please provide filter parameter')
            return;
        }

        let updatedList = this.props.markers.filter(place => {
            const targetText = place.title.toLowerCase();
            return targetText.search(filterBy) !== -1;
        });
        this.props.updateFilteredMarkers(updatedList);
    }

    onKeyPressHandleFilter = e => {
        if (e.charCode === 13) {
            this.filterList();
        }
    }

    onClickPlaceListItem = (event) => {
        const placeTitle = event.target.dataset.placeTitle;
        this.props.selectMarkerByTitle(placeTitle);
    }
  
    render() {
        return (
            <aside className="sidebar">
                <input
                    aria-label="Search for location"
                    aria-required="true"
                    onKeyPress={this.handleKeyPressSearch}
                    className="input"
                    type="text"
                    name="search"
                    id="search"
                    placeholder="Search For ..."
                    required
                />
                <button aria-label="Search for location" className="btn" onClick={this.search}>Search</button>
                <input
                    aria-label="Filter location from given ones"
                    aria-required="true"
                    onKeyPress={this.onKeyPressHandleFilter}
                    className="input"
                    type="text"
                    name="filter"
                    id="filter"
                    placeholder="Filter By Name ..."
                />
                <button aria-label="Filter location by name" className="btn" onClick={this.filterList}>Filter</button>
                
                <ul className="place-names">
                { this.state.searchBy ?
                    <span>{this.state.searchErrMsg}</span>:
                      
                        this.props.filteredmarkers.map((place) => {
                            return <li tabIndex="0" key={place.id} data-place-title={place.title} onClick={this.onClickPlaceListItem} onKeyPress={this.onClickPlaceListItem}>
                                {place.name}<hr /></li>
                        })
                    }
                </ul>
            </aside>
        );
    }
}

Sidebar.propTypes = {
    Geocoder: PropTypes.func,
    updateMarkers: PropTypes.func,
    markers: PropTypes.array,
    filteredmarkers: PropTypes.array,
    selectMarkerByTitle: PropTypes.func
}
