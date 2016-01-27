(function(global) {
  'use strict';

  var $ = function(s) { return document.querySelector(s); };

  function capitalize(s) {
    return s.substring(0, 1).toUpperCase() + s.substring(1);
  }

  function firstOrNull(a) {
    if (a && a.length > 0)
      return a[0];
    return null;
  }


  function parseSector(tabDelimitedData, metadata) {
    var i, sector = {
      metadata: metadata,
      worlds: []
    };

    var lines = tabDelimitedData.split(/\r?\n/);
    var header = lines.shift().toLowerCase().split('\t');
    lines.forEach(function (line) {
      if (!line.length)
        return;

      var world = {};
      line.split('\t').forEach(function (field, index) {
        var col = header[index].replace(/[^a-z]/g, '');
        world[col] = field;
      });
      var exp = Traveller.fromHex(world.uwp.charAt(4)),
          mult = Traveller.fromHex(world.pbg.charAt(0));
      world.population = exp >= 0 && mult >= 0 ? Math.pow(10, exp) * mult : 0;
      if (world.population >= 1e9)
        world.hipop = true;
      sector.worlds.push(world);
    });

    sector.worlds.sort(function(a, b) { return a.hex < b.hex ? -1 : a.hex > b.hex ? 1 : 0; });

    var LINES = 128, COLUMNS = 2;

    sector.pages = partition(sector.worlds, LINES*COLUMNS)
      .map(function(a) { return {columns: partition(a, LINES)
                                 .map(function(w) { return { worlds: w }; })}; });

    sector.pages.forEach(function(page, index) {
      page.index = index + 1;
    });
    sector.page_count = sector.pages.length;

    sector.name = metadata.Names[0].Text;

    return sector;
  }

  function partition(list, count) {
    var result = [];
    var copy = list.slice();
    while (copy.length) {
      result.push(copy.splice(0, count));
    }
    return result;
  }

  window.addEventListener('DOMContentLoaded', function() {
    var sectors = [
      'spin', 'dene', 'corr', 'vlan', 'lish', 'anta', 'empt',
      'troj', 'reft', 'gush', 'dagu', 'core', 'forn', 'ley',
      /*   */ 'verg', 'ilel', 'zaru', 'mass', 'delp', 'glim',
      /*           */ 'reav', 'daib', 'dias', 'olde', 'hint',
      /*           */ 'magy', 'solo', 'alph'
    ];
    Promise.all(sectors.map(function(name) {
      return Promise.all([
        name,
        Traveller.MapService.sectorDataTabDelimited(name),
        Traveller.MapService.sectorMetaData(name)
      ]);
    })).then(render);
  });

  function render(sectors) {
    var data = {};

    data.sectors = sectors.map(function(tuple) {
      var name = tuple[0], data = tuple[1], metadata = tuple[2];
      var sector = parseSector(data, metadata);

      sector.img_src = Traveller.MapService.makeURL(
        '/api/poster', {sector: name, style: 'print'});

      return sector;
    });

    data.date = (new Date).toISOString();

    var template = Handlebars.compile($('#template').innerHTML);

    document.body.innerHTML = template(data);
    window.data = data;
  };

}(self));