Ext.define('CustomApp', {
    extend: 'Rally.app.TimeboxScopedApp',
    componentCls: 'app',
    scopeType: 'release',

    addContent: function() {
        var panel = Ext.create('Ext.panel.Panel', {
            width: 1200,
            layout: 'column',
            itemId: 'parentPanel',
            componentCls: 'panel',
            items: [
                {
                    xtype: 'panel',
                    title: 'Stories',
                    itemId: 'childPanel1',
                    columnWidth: 0.3
                },
                {
                    xtype: 'panel',
                    title: 'Test Sets with Test Cases',
                    itemId: 'childPanel2',
                    columnWidth: 0.7
                }
            ]
        });
        this.add(panel);
        this._makeStore();
    },
    
   onScopeChange: function() {
        console.log('onScopeChange');
        this._makeStore();
    },
    
    _makeStore: function(){
         var storyStore = Ext.create('Rally.data.WsapiDataStore', {
            model: 'UserStory',
            fetch: ['FormattedID','Name'],
            pageSize: 100,
            autoLoad: true,
            filters: [this.getContext().getTimeboxScope().getQueryFilter()],
            listeners: {
                load: this._onStoriesLoaded,
                scope: this
            }
        }); 
    },
    
      _onStoriesLoaded: function(store, data){
                var userStories = [];
                Ext.Array.each(data, function(story) {
                    var s  = {
                        FormattedID: story.get('FormattedID'),
                        _ref: story.get("_ref"),  
                        Name: story.get('Name'),
                    };
                    userStories.push(s);
                 });
                this._createStoryGrid(userStories);
    },
    _createStoryGrid:function(stories){
        var that = this;
        var storyStore = Ext.create('Rally.data.custom.Store', {
                data: stories,
                pageSize: 100
            });
        if (!this.down('#storygrid')) {
            this.down('#childPanel1').grid = this.down('#childPanel1').add({
            xtype: 'rallygrid',
            itemId: 'storygrid',
            store: storyStore,
            columnCfgs: [
                {
                   text: 'Formatted ID', dataIndex: 'FormattedID', xtype: 'templatecolumn',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name', dataIndex: 'Name',flex:2
                }
            ],
            listeners: {
                render: this._makeAnotherStore,
                scope: this
            }
        });
         }else{
            this.down('#childPanel1').grid.reconfigure(storyStore);
            this._makeAnotherStore(this);
         }
    },
    
    _makeAnotherStore: function(){
        Ext.create('Rally.data.WsapiDataStore', {
                model: 'TestSet',
                fetch: ['FormattedID', 'TestCases', 'TestCaseStatus'],  
                pageSize: 100,
                autoLoad: true,
                filters: [this.getContext().getTimeboxScope().getQueryFilter()],
                listeners: {
                    load: this._onTestSetsLoaded,
                    scope: this
                }
            }); 
    },
     _onTestSetsLoaded: function(store, data){
        var testSets = [];
        var pendingTestCases = data.length;
         console.log(data.length);
         if (data.length ===0) {
            this._createTestSetGrid(testSets);  //to force refresh on testset grid when there are no testsets in the iteration
         }
         Ext.Array.each(data, function(testset){ 
            var ts  = {
                FormattedID: testset.get('FormattedID'),   
                _ref: testset.get('_ref'),  //required to make FormattedID clickable
                TestCaseStatus: testset.get('TestCaseStatus'),
                TestCaseCount: testset.get('TestCases').Count,
                TestCases: []
            };
            var testCases = testset.getCollection('TestCases');
            testCases.load({
                                fetch: ['FormattedID'],
                                callback: function(records, operation, success){
                                    Ext.Array.each(records, function(testcase){
                                        ts.TestCases.push({_ref: testcase.get('_ref'),
                                                        FormattedID: testcase.get('FormattedID')
                                                    });
                                    }, this);
                                    --pendingTestCases;
                                    if (pendingTestCases === 0) {
                                        this._createTestSetGrid(testSets);
                                    }
                                },
                                scope: this
                            });
            testSets.push(ts);
     },this);
 },
    
      _createTestSetGrid: function(testsets) {
        var testSetStore = Ext.create('Rally.data.custom.Store', {
                data: testsets,
                pageSize: 100,  
            });
        if (!this.down('#testsetgrid')) {
         this.down('#childPanel2').grid = this.down('#childPanel2').add({
            xtype: 'rallygrid',
            itemId: 'testsetgrid',
            store: testSetStore,
            columnCfgs: [
                {
                   text: 'Formatted ID', dataIndex: 'FormattedID', xtype: 'templatecolumn',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Test Case Count', dataIndex: 'TestCaseCount',
                },
                {
                    text: 'Test Case Status', dataIndex: 'TestCaseStatus',flex:1
                },
                {
                    text: 'TestCases', dataIndex: 'TestCases',flex:1, 
                    renderer: function(value) {
                        var html = [];
                        Ext.Array.each(value, function(testcase){
                            html.push('<a href="' + Rally.nav.Manager.getDetailUrl(testcase) + '">' + testcase.FormattedID + '</a>')
                        });
                        return html.join(', ');
                    }
                }
            ]
        });
         }else{
            this.down('#childPanel2').grid.reconfigure(testSetStore);
         }
    }
});

