const CreateReactClass = require('create-react-class');
const PropTypes = require('prop-types');
const {
  ListView,
  TouchableHighlight,
  View,
  Text,
  RefreshControl,
  InteractionManager,
  ActivityIndicator,
} = require('react-native');


// small helper function which merged two objects into one
function MergeRecursive(obj1, obj2) {
  for (const p in obj2) {
    try {
      if (obj2[p].constructor == Object) {
        obj1[p] = MergeRecursive(obj1[p], obj2[p]);
      } else {
        obj1[p] = obj2[p];
      }
    } catch (e) {
      obj1[p] = obj2[p];
    }
  }
  return obj1;
}

const GiftedListView = CreateReactClass({

  getDefaultProps() {
    return {
      autoUpdate: false,
      autoUpdateDataSource: null,
      customStyles: {},
      initialListSize: 10,
      firstLoader: true,
      pagination: true,
      refreshable: true,
      refreshableColors: undefined,
      refreshableProgressBackgroundColor: undefined,
      refreshableSize: undefined,
      refreshableTitle: undefined,
      refreshableTintColor: undefined,
      renderRefreshControl: null,
      headerView: null,
      sectionHeaderView: null,
      scrollEnabled: true,
      withSections: false,
      autoPaginate: false,
      onFetch(page, callback, options) { callback([]); },

      paginationFetchingView: null,
      paginationAllLoadedView: null,
      paginationWaitingView: null,
      emptyView: null,
      renderSeparator: null,
      rowHasChanged: null,
      distinctRows: null,
    };
  },

  propTypes: {
    autoUpdate: PropTypes.bool,
    autoUpdateDataSource: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object
    ]),
    customStyles: PropTypes.object,
    initialListSize: PropTypes.number,
    firstLoader: PropTypes.bool,
    pagination: PropTypes.bool,
    refreshable: PropTypes.bool,
    refreshableColors: PropTypes.array,
    refreshableProgressBackgroundColor: PropTypes.string,
    refreshableSize: PropTypes.string,
    refreshableTitle: PropTypes.string,
    refreshableTintColor: PropTypes.string,
    renderRefreshControl: PropTypes.func,
    headerView: PropTypes.func,
    sectionHeaderView: PropTypes.func,
    scrollEnabled: PropTypes.bool,
    withSections: PropTypes.bool,
    autoPaginate: PropTypes.bool,
    onFetch: PropTypes.func,

    paginationFetchingView: PropTypes.func,
    paginationAllLoadedView: PropTypes.func,
    paginationWaitingView: PropTypes.func,
    emptyView: PropTypes.func,
    renderSeparator: PropTypes.func,

    rowHasChanged: PropTypes.func,
    distinctRows: PropTypes.func,
  },

  _setPage(page) { this._page = page; },
  _getPage() { return this._page; },
  _setRows(rows) { this._rows = rows; },
  _getRows() { return this._rows; },

  paginationFetchingView() {
    if (this.props.paginationFetchingView) {
      return this.props.paginationFetchingView();
    }

    return (
      <View style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}>
        <ActivityIndicator />
      </View>
    );
  },
  paginationAllLoadedView() {
    if (this.props.paginationAllLoadedView) {
      return this.props.paginationAllLoadedView();
    }

    return (
      <View />
    );
  },
  paginationWaitingView(paginateCallback) {
    if (this.props.paginationWaitingView) {
      return this.props.paginationWaitingView(paginateCallback);
    }

    return (
      <TouchableHighlight
        underlayColor="#c8c7cc"
        onPress={paginateCallback}
        style={[this.defaultStyles.paginationView, this.props.customStyles.paginationView]}
      >
        <Text style={[this.defaultStyles.actionsLabel, this.props.customStyles.actionsLabel]}>
          Load more
        </Text>
      </TouchableHighlight>
    );
  },
  headerView() {
    if (this.state.paginationStatus === 'firstLoad' || !this.props.headerView) {
      return null;
    }
    return this.props.headerView();
  },
  emptyView(refreshCallback) {
    if (this.props.emptyView) {
      return this.props.emptyView(refreshCallback);
    }

    return (
      <View style={[this.defaultStyles.defaultView, this.props.customStyles.defaultView]}>
        <Text style={[this.defaultStyles.defaultViewTitle, this.props.customStyles.defaultViewTitle]}>
          Sorry, there is no content to display
        </Text>

        <TouchableHighlight
          underlayColor="#c8c7cc"
          onPress={refreshCallback}
        >
          <Text>
            ↻
          </Text>
        </TouchableHighlight>
      </View>
    );
  },
  renderSeparator() {
    if (this.props.renderSeparator) {
      return this.props.renderSeparator();
    }

    return (
      <View style={[this.defaultStyles.separator, this.props.customStyles.separator]} />
    );
  },

  getInitialState() {
    this._setPage(1);
    this._setRows([]);

    let ds = null;
    if (this.props.withSections === true) {
      ds = new ListView.DataSource({
        rowHasChanged: this.props.rowHasChanged ? this.props.rowHasChanged : (row1, row2) => row1 !== row2,
        sectionHeaderHasChanged: (section1, section2) => section1 !== section2,
      });
      return {
        dataSource: ds.cloneWithRowsAndSections(this._getRows()),
        isRefreshing: false,
        paginationStatus: 'firstLoad',
      };
    }
    ds = new ListView.DataSource({
      rowHasChanged: this.props.rowHasChanged ? this.props.rowHasChanged : (row1, row2) => row1 !== row2,
    });
    return {
      dataSource: ds.cloneWithRows(this._getRows()),
      isRefreshing: false,
      paginationStatus: 'firstLoad',
    };
  },

  componentDidMount() {
    this._isMounted = true;
    InteractionManager.runAfterInteractions(() => {
      this.props.onFetch(this._getPage(), this._postRefresh, { firstLoad: true });
    });
  },

	componentWillUnmount() {
    this._isMounted = false;
  },

  // TODO: check for diff item, maybe use: rowHasChange or lodash _.unionBy
  componentWillReceiveProps(nextProps) {
    const {
      autoUpdateDataSource,
      autoUpdate,
    } = nextProps;
    if (autoUpdate && autoUpdateDataSource) {
      this._updateRows(autoUpdateDataSource, { allLoaded: true });
    }
  },

  setNativeProps(props) {
    this.refs.listview.setNativeProps(props);
  },

  _refresh() {
    this._onRefresh({ external: true });
  },

  _onRefresh(options = {}) {
    if (this._isMounted) {
      this.setState({
        isRefreshing: true,
      });
      this._setPage(1);
      this.props.onFetch(this._getPage(), this._postRefresh, options);
    }
  },

  _refreshWithoutEffect(options = {}) {
    if (this._isMounted) {
      this._setPage(1);
      this.props.onFetch(this._getPage(), this._postRefresh, options);
    }
  },

  _postRefresh(rows = [], options = {}) {
    if (this._isMounted) {
      this._updateRows(rows, options);
    }
  },

  onEndReached() {
    if (!this.state.firstLoadComplete) return;

    if (this.props.autoPaginate) {
      this._onPaginate();
    }
    if (this.props.onEndReached) {
      this.props.onEndReached();
    }
  },
  _onPaginate() {
    if (this.state.paginationStatus === 'allLoaded') {
      return null;
    }
    this.setState({
      paginationStatus: 'fetching',
    });
    this.props.onFetch(this._getPage() + 1, this._postPaginate, {});
  },

  _postPaginate(rows = [], options = {}) {
    this._setPage(this._getPage() + 1);
    let mergedRows = null;
    if (this.props.withSections === true) {
      mergedRows = MergeRecursive(this._getRows(), rows);
    } else {
      mergedRows = this._getRows().concat(rows);
    }

    if (this.props.distinctRows) {
      mergedRows = this.props.distinctRows(mergedRows);
    }

    this._updateRows(mergedRows, options);
  },

  _updateRows(rows = [], options = {}) {
    if (rows !== null) {
      this._setRows(rows);
      if (this.props.withSections === true) {
        this.setState({
          dataSource: this.state.dataSource.cloneWithRowsAndSections(rows),
          isRefreshing: false,
          paginationStatus: (options.allLoaded === true ? 'allLoaded' : 'waiting'),
        });
      } else {
        this.setState({
          dataSource: this.state.dataSource.cloneWithRows(rows),
          isRefreshing: false,
          paginationStatus: (options.allLoaded === true ? 'allLoaded' : 'waiting'),
        });
      }
    } else {
      this.setState({
        isRefreshing: false,
        paginationStatus: (options.allLoaded === true ? 'allLoaded' : 'waiting'),
      });
    }


     // this must be fired separately or iOS will call onEndReached 2-3 additional times as
    // the ListView is filled. So instead we rely on React's rendering to cue this task
    // until after the previous state is filled and the ListView rendered. After that,
    // onEndReached callbacks will fire. See onEndReached() above.
    if (!this.state.firstLoadComplete) this.setState({ firstLoadComplete: true });
  },

  _renderPaginationView() {
    const paginationEnabled = this.props.pagination === true || this.props.autoPaginate === true;

    if ((this.state.paginationStatus === 'fetching' && paginationEnabled) || (this.state.paginationStatus === 'firstLoad' && this.props.firstLoader === true)) {
      return this.paginationFetchingView();
    } else if (this.state.paginationStatus === 'waiting' && this.props.pagination === true && (this.props.withSections === true || this._getRows().length > 0)) {
      return this.paginationWaitingView(this._onPaginate);
    } else if (this.state.paginationStatus === 'allLoaded' && paginationEnabled) {
      return this.paginationAllLoadedView();
    } else if (this._getRows().length === 0) {
      return this.emptyView(this._onRefresh);
    }
    return null;
  },

  renderRefreshControl() {
    if (this.props.renderRefreshControl) {
      return this.props.renderRefreshControl({ onRefresh: this._onRefresh });
    }
    return (
      <RefreshControl
        onRefresh={this._onRefresh}
        refreshing={this.state.isRefreshing}
        colors={this.props.refreshableColors}
        progressBackgroundColor={this.props.refreshableProgressBackgroundColor}
        size={this.props.refreshableSize}
        tintColor={this.props.refreshableTintColor}
        title={this.props.refreshableTitle}
      />
    );
  },


  render() {
    return (
      <ListView
        ref="listview"
        dataSource={this.state.dataSource}
        renderRow={this.props.rowView}
        renderSectionHeader={this.props.sectionHeaderView}
        renderHeader={this.headerView}
        renderFooter={this._renderPaginationView}
        renderSeparator={this.renderSeparator}
        onEndReached={this.onEndReached}
        automaticallyAdjustContentInsets={false}
        scrollEnabled={this.props.scrollEnabled}
        canCancelContentTouches
        refreshControl={this.props.refreshable === true ? this.renderRefreshControl() : null}

        {...this.props}

        style={this.props.style}
      />
    );
  },

  defaultStyles: {
    separator: {
      height: 1,
      backgroundColor: '#CCC',
    },
    actionsLabel: {
      fontSize: 20,
    },
    paginationView: {
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFF',
    },
    defaultView: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    defaultViewTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 15,
    },
  },
});


module.exports = GiftedListView;
