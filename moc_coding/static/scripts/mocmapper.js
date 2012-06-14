/**
 CustomCareer mapping application written using:
  - Backbone.js <http://backbonejs.org>

 To implement, add the following line to the template where you want to include
 this app:
 
 {% include "/path/to/mocmapper.html" %}

 Right now of course this is specialized to our current need: having this
 functionality on the BusinessUnit ModelAdmin page in the Django admin panel.
 However, this has been designed as a portable app suitable for "dropping in"
 anywhere.

 Backbone.js was chosen to give structure to this application, in a familiar
 MVC-like pattern. 
 
**/

$(function () {
  var searchApi = "/seo/v1/jobsearch/";
  // MOC-O*NET Map Model. We're calling it CustomCareer to keep it consistent
  // with what we're calling it in moc_coding.models.
  var CustomCareer = Backbone.Model.extend({
    defaults: function() {
      return {
        moc: null,
        onet: null,
        businessunit: null,
        objId: null
      };
    }   
  });

  var CustomCareers = Backbone.Collection.extend({
    model: CustomCareer,
    localStorage: new Store("mocmap-backbone")
  });
  var MocMaps = new CustomCareers;

  var JobOption = Backbone.Model.extend({
    defaults: function() {
      return {
        value: null,
        text: null
      };
    }
  });

  var JobOptions = Backbone.Collection.extend({
    model: JobOption,
    localStorage: new Store("mocmap-jobopts")
  });
  var Options = new JobOptions;
  
  var AppView = Backbone.View.extend({
    el: $("#mapper"),
    events: {
      "click button#moc-button": "fetchMocs",
      "click button#search-titles": "searchOnPress",
      "click button#preview-results": "previewResults",
      "click button#create-map": "createMap",
      "click #toggle-all": "toggleAllBranches",
      "change select#title-jobs": "filterOnets",
      "change select#onet-select": "filterJobs",
      "click button#delete-items": "deleteSelected",
      "click button#reset": "reset"
    },
    
    objid: function() {
      /**
       Compute the BusinessUnit ID for the current page.

       This may need to change if we put this app somewhere besides the Django
       admin panel, relative to where the BUID is in the URL.
       
      **/
      var path = window.location.pathname.split("/");
      return path[path.length-2];
    },
    
    initialize: function() {
      /**
       Constructor method for this view object.
       
      **/
      var customCareers = $("#maps-by-objid");
      var objid = this.objid();
      // Retrieve all CustomCareer instances that already exist for this object
      // and display them with checkboxes so they can be deleted.
      $.ajax({
        url: "/mocmaps/all/?ct=21&oid="+this.objid(),
        dataType: "jsonp",
        jsonp: "callback",
        success: function(result) {
          $.each(result, function(index, item) {
            MocMaps.create({
                moc: item.moc,
                onet: item.onet,
                businessunit: objid,
                objId: item.id
            });
            var p = $('<p id=p'+item.pk+'>');
            var label = $("<label for="+item.pk+">");
            var mapCheckbox = $('<input type="checkbox" id='+item.pk+'>');
            var repr = "O*NET:"+item.onet_id+" -> "+"MOC:"+item.moc_id;
            p.append(mapCheckbox).append(label.append(repr));
            customCareers.append(p);
          });
        }
      });

      $.each(MocMaps, function(index, item) {
      });
      this.input = this.$("#job-title");
      var apiKey = "a090afefab8a39c82ae64a88a7ce36beb50dbedb";
      var apiUser = "mocmapclient";
      this.authParams = "?format=json&limit=1000&username="+apiUser+"&api_key="+apiKey;
      this.buidParam = "&buid=" + this.objid();
    },

    fetchMocs: function() {
      /**
       Fetches MOC data, filtering by branch. Which branches are used is
       indicated by the <input> elements named `branch`. The `value` attribute
       of each <input> is passed to Django, which uses that information in a
       `Moc.objects.filter()` call.
       
      **/
      var branches = [];
      $.each($("span#branch-checkboxes input:checked"), function(index, value) {
        branches.push($(value).val());
      });
      branches = branches.join(",");
      $.ajax({
        url: "/mocmaps/mocdata/?branch="+branches,
        dataType: "jsonp",
        jsonp: "callback",
        success: function (result) {
          _buildOptions(result.mocs, "moc");
        }
      });
    },

    searchOnPress: function() {
      /**
       Defines the behavior of the "Search Jobs" button used to populate the
       <select> with O*NET information.

      **/
      // Clear the Options collection
      $("section#onets select").empty();
      _clearForm();
      if (!this.input.val()) {
        $("ul#mocmap.messagelist").append(
          '<li class="error">You must enter a search term.</li>'
        );
        return;
      };
      var term = this.input.val();
      $.ajax({
        url: searchApi+this.authParams+this.buidParam+"&title="+term,
        dataType: "json",
        success: function(result) {
          var seenOnets = [];
          var seenTitles = [];
          var docs = result.objects;
          var target = $("select#title-jobs");
          for (var i=0, l=docs.length; i<l; i++) {
            var doc = docs[i];
            if ($.inArray(doc.onet, seenOnets) == -1) {
              seenOnets.push(doc.onet);
            }
            target.append("<option value="+doc.onet+">"+doc.title+
                          "</option>");
          }
          $.ajax({
            url: "/mocmaps/onetdata/?onets="+seenOnets.join(","),
            dataType: "jsonp",
            jsonp: "callback",
            success: function(result) {
              var target = $("select#onet-select");
              target.empty();
              target.append('<option value="">-----</option>');            
              $.each(result, function(index, value) {
                target.append("<option value="+value.code+
                              ">" + value.title + "</option>");
              });
            }
          });
        } 
      });
    },  

    previewResults: function() {
      /**
       Generate the "preview" of what jobs will match a particular MOC+O*NET
       combination. These are matched only from jobs for the current
       BusinessUnit.

      **/
      var moc = $("select#moc-select option:selected").attr("value");
      var mocText = $("select#moc-select option:selected").text();
      var onet = $("select#onet-select option:selected").attr("value");

      if ((moc || onet) === false) {
        $("ul#mocmap.messagelist").append(
          '<li class="error">You must select an O*NET and MOC to preview search\
           results.</li>'
        );
        return;
      }
      $("ul#solr-preview").empty();

      $.ajax({
        url: searchApi+this.authParams+this.buidParam+"&onet="+onet,
        dataType: "json",
        success: function(result) {
          var count = result.meta.total_count;
          var docs = result.objects;
          var ctTarget = $("span#jobcount");
          var resultTarget = $("span#preview");
          var res = " Results";

          if (count > 25) {
            res = res + " (Showing first 25)";
          };
          ctTarget.text(count + res);
          resultTarget.html(
            '<h3>Job-seekers will see jobs like these when searching for MOC '+
            mocText+'</h3>'
          );
          var ul = $("ul#solr-preview");
          for (var i=0, l=docs.length; i<l; i++) {
            var doc = docs[i];
            ul.append("<li id="+doc.uid+">"+doc.title+"</li>");
          }
        }
      });
    },

    createMap: function() {
      /**
       Pass the user-selected MOC & O*NET data to Django so it can save a new
       CustomCareer instance based off of it.

       The `url` attribute of the ajax call uses `oid` and `ct` parameters.
       This information is the BusinessUnit ID and the ContentType ID.
       ContentType
       
      **/
      var moc = $("select#moc-select option:selected").attr("value");
      var branch = $("select#moc-select option:selected").attr("branch");
      var onet = $("select#onet-select option:selected").attr("value");
      $.ajax({
        url: "/mocmaps/newmap/?onet="+onet+"&moc="+moc+"&branch="+branch+"&oid="+this.objid()+"&ct=21",
        dataType: "jsonp",
        jsonp: "callback",
        success: function(result) {
          if (result.status == "success") {
            $("ul#mocmap.messagelist").append(
              '<li class="success">Custom MOC->O*NET mapping successful!</li>'
            );
            var p = $('<p id=p'+result.id+'>');
            var label = $("<label for="+result.id+">");
            var mapCheckbox = $('<input type="checkbox" id='+result.id+'>');
            var repr = "O*NET:"+onet+" -> "+"MOC:"+moc;
            p.append(mapCheckbox).append(label.append(repr));
            $("#maps-by-objid").append(p);
          }
        }
      });
    },

    toggleAllBranches: function() {
      var bool = $("input#toggle-all").attr("checked") || false;
      var branchBoxes = $("span#branch-checkboxes").children();
      branchBoxes.attr("checked", bool);
    },

    filterOnets: function() {
      /**
       Filter results in the O*NET dropdown by the job the user selects from
       the "title-jobs" <select>.
       
      **/
      var selected = $("select#title-jobs option:selected");
      var jobOnet = selected.attr("value");
      $("select#onet-select option[value="+jobOnet+"]").prop("selected", true);
    },

    filterJobs: function() {
      /**
       Filter the jobs available in the "title-jobs" <select> by which O*NET
       the user has selected from the "onet-select" <select>.
       
      **/
      var onet = $("select#onet-select option:selected").attr("value");
      var jobSelect = $("select#title-jobs");
      // Populate the `Options` collection if and only if it doesn't already
      // have data in it. `Options` is emptied whenever a new search is
      // executed.
      if (Options.length == 0) {
        jobSelect.find("option").each(function() {
          var opt = new JobOption({value: $(this).attr("value"),
                                   text: $(this).text()});
          Options.add(opt);
        });
      }

      // Return an array of the job <option> elements whose "value" attribute
      // matches the selected O*NET. `.filter()` is an Underscore.js method,
      // which Backbone.js implements and binds to Collection instances.
      var onetMatches = Options.filter(function(opt) {
        if (onet == "") {
          return true;
        } else {
          return opt.get("value") == onet || opt.get("text") == "-----";
        }
      });

      // Empty out the "title-jobs" <select> and repopulate it with the <option>
      // elements whose `value` attribute equals the selected O*NET code.
      var jobOpts = function() {
        jobSelect.empty();
        $.each(onetMatches, function(index, i) {
          jobSelect.append($("<option>").text(i.get("text")).attr("value", i.get("value")));
        });
      };
      jobOpts();
    },

    deleteSelected: function() {
      /**
       Delete the CustomCareer instances from the database the user has
       indicated by checking their corresponding checkbox.
       
      **/
      var checked = $("#maps-by-objid input:checked");
      var itemIds = [];
      $.each(checked, function(index, value) {
        itemIds.push($(value).attr("id"));
      });
      var itemids = itemIds.join(",");
      $.ajax({
        url: "/mocmaps/delete/?ids="+itemids,
        dataType: "jsonp",
        jsonp: "callback",
        success: function(result) {
          _.map(result, function(x) {
            $("#maps-by-objid p[id=p"+x.id+"]").remove();
          });
        }
      });
    },

    reset: function() {
      /**
       Reset each form element back to empty.
       
      **/
      this.input.val(null);
      $("div#mapper select").empty();
      _clearForm();
    }

  });

  // Create options for select boxes from moc arrays returned by the
  // Django view.
  var _buildOptions = function(result, type) {
    var target = $("select#"+type+"-select");
    $(target).empty();
    $.each(result, function(index, value) {
      $(target).append("<option value="+value.code+" branch="+value.branch+
                       ">"+value.code + " - " +value.title+"</option>");
    });
  };

  var _clearForm = function() {
    Options.reset();
    $("ul#solr-preview").empty();
    $("#jobcount").empty();
    $("span#preview").empty();
    $("ul#mocmap").empty();
  };
  
  var App = new AppView;
});
