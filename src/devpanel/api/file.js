var inspectBasis = require('devpanel').inspectBasis;
var inspectBasisTemplate = inspectBasis.require('basis.template');
var sendData = require('devpanel.transport').sendData;
var File = require('../basisjs-tools-sync.js').File;

function sendFile(file){
  var data = {
    filename: file.data.filename,
    content: file.data.content
  };

  if (basis.path.extname(data.filename) == '.tmpl')
  {
    data.declaration = inspectBasisTemplate.makeDeclaration(
      data.content || '',
      basis.path.dirname(basis.path.resolve(data.filename)) + '/',
      {},
      data.filename
    );
    data.resources = data.declaration.resources.map(function(resource){
      return resource.url;
    });
    // delete deps as it can has resource and ResourceWrapper which can't be serialized
    data.declaration.deps = [];
    data.declaration.includes = [];
  }

  sendData('updateFile', data);
}

var FILE_HANDLER = {
  update: function(object, delta){
    if ('content' in delta && this.data.content !== null)
      sendFile(this);
  }
};
var FILE_LIST_HANDLER = {
  itemsChanged: function(dataset, delta){
    var data = {};

    if (delta.inserted)
      data.inserted = delta.inserted.map(function(item){
        item.addHandler(FILE_HANDLER);
        return item.data.filename;
      });

    if (delta.deleted)
      data.deleted = delta.deleted.map(function(item){
        item.removeHandler(FILE_HANDLER);
        return item.data.filename;
      });

    if (data.inserted || data.deleted)
      sendData('filesChanged', data);
  }
};

File.all.addHandler(FILE_LIST_HANDLER);
File.all.getItems().forEach(function(file){
  file.addHandler(FILE_HANDLER);
});

//
// exports
//
module.exports = {
  getFileList: function(done){
    done(null, File.all.getValues('data.filename'));
  },
  getFileGraph: function(done){
    var basisjsTools = global.basisjsToolsFileSync;

    if (basisjsTools)
      basisjsTools.getFileGraph(function(err, data){
        if (err)
          done(err);
        else
          done(null, JSON.parse(data));
      });
    else
      done('No basisjs-tools');
  },
  createFile: function(done, filename){
    var basisjsTools = global.basisjsToolsFileSync;

    if (basisjsTools)
      basisjsTools.createFile(filename, done);
    else
      done('No basisjs-tools');
  },
  readFile: function(done, filename){
    var file = File.get(filename);

    if (file)
    {
      if (typeof file.data.content == 'string')
        sendFile(file);
      else
        file.read();
    }
  },
  saveFile: function(done, filename, content){
    var file = File.get(filename);

    if (file)
      file.save(content);
  },
  openFile: function(filename){
    var basisjsTools = typeof basisjsToolsFileSync != 'undefined' ? basisjsToolsFileSync : inspectBasis.devtools;

    if (basisjsTools && typeof basisjsTools.openFile == 'function')
      basisjsTools.openFile(basis.path.resolve(filename.replace(/(:\d+:\d+):\d+:\d+$/, '$1')));
  }
};
