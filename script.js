$(document).ready(function () {
    const apiUrl = 'https://webservice.tecalliance.services/pegasus-3-0/services/TecdocToCatDLB.jsonEndpoint';
    const apiKey = '2BeBXg6QJiiGVVVKFLo53R3wXV5dfzjv4DRv6bMB6WKnhm3uT8Je';

    // Initial load for manufacturers
    const mfrRequestBody = {
        "getLinkageTargets": {
            "provider": 24891,
            "linkageTargetCountry": "DE",
            "lang": "de",
            "linkageTargetType": "P",
            "perPage": 0,
            "page": 1,
            "includeMfrFacets": true
        }
    };

    $.ajax({
        url: apiUrl,
        type: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-api-key': apiKey
        },
        data: JSON.stringify(mfrRequestBody),
        success: function (data) {
            if (data.mfrFacets && data.mfrFacets.counts) {
                const manufacturers = data.mfrFacets.counts;
                const $select = $('#manufacturer_select');

                $.each(manufacturers, function (index, mfr) {
                    const $option = $('<option>', {
                        value: mfr.id,
                        text: mfr.name,
                        'count': mfr.count,
                        'linkageTargetType': mfr.linkageTargetType
                    });
                    $select.append($option);
                });
            } else {
                console.error('Unexpected response structure:', data);
            }
        },
        error: function (xhr, status, error) {
            console.error('Error fetching data:', error);
        }
    });

    // Helper function to format date from YYYYMM to MM.YYYY
    function formatDate(dateInt) {
        if (!dateInt) return '';
        const dateStr = dateInt.toString();
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        return `${month}.${year}`;
    }

    // Helper function to format YYYY-MM to MM.YYYY
    function formatStringDate(dateStr) {
        if (!dateStr) return '';
        const [year, month] = dateStr.split('-');
        return `${month}.${year}`;
    }

    // Handle manufacturer change
    $('#manufacturer_select').on('change', function () {
        const mfrId = $(this).val();
        const $modelSelect = $('#model_select');
        const $engineSelect = $('#engine_select');

        // Clear existing options except the first one
        $modelSelect.find('option:not(:first)').remove();
        $modelSelect.find('optgroup').remove();
        $engineSelect.find('option:not(:first)').remove(); // Also clear engines

        if (!mfrId) return;

        const modelRequestBody = {
            "getLinkageTargets": {
                "provider": 24891,
                "linkageTargetCountry": "DE",
                "lang": "de",
                "linkageTargetType": "P",
                "mfrIds": parseInt(mfrId),
                "perPage": 0,
                "page": 1,
                "includeVehicleModelSeriesFacets": true
            }
        };

        $.ajax({
            url: apiUrl,
            type: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            data: JSON.stringify(modelRequestBody),
            success: function (data) {
                if (data.vehicleModelSeriesFacets && data.vehicleModelSeriesFacets.counts) {
                    const models = data.vehicleModelSeriesFacets.counts;
                    const groups = {};

                    // Group models by the first word of their name
                    $.each(models, function (index, model) {
                        const groupName = model.name.split(' ')[0];
                        if (!groups[groupName]) {
                            groups[groupName] = [];
                        }
                        groups[groupName].push(model);
                    });

                    // Create optgroups and options
                    $.each(groups, function (groupName, groupModels) {
                        const $optgroup = $('<optgroup>', { label: groupName });

                        $.each(groupModels, function (index, model) {
                            const beginDate = formatDate(model.beginYearMonth);
                            const endDate = formatDate(model.endYearMonth);
                            const dateRange = `(${beginDate} – ${endDate})`;
                            const optionText = `${model.name} ${dateRange}`;

                            const $option = $('<option>', {
                                value: model.id,
                                text: optionText,
                                'data-count': model.count // Store the count for perPage
                            });
                            $optgroup.append($option);
                        });

                        $modelSelect.append($optgroup);
                    });
                } else {
                    console.error('Unexpected response structure for models:', data);
                }
            },
            error: function (xhr, status, error) {
                console.error('Error fetching models:', error);
            }
        });
    });

    // Handle model change
    $('#model_select').on('change', function () {
        const modelId = $(this).val();
        const mfrId = $('#manufacturer_select').val();
        const $selectedOption = $(this).find('option:selected');
        const perPage = $selectedOption.data('count') || 100; // Default to 100 if not found
        const $engineSelect = $('#engine_select');

        // Clear existing options except the first one
        $engineSelect.find('option:not(:first)').remove();

        if (!modelId || !mfrId) return;

        const engineRequestBody = {
            "getLinkageTargets": {
                "provider": 24891,
                "linkageTargetCountry": "DE",
                "lang": "DE",
                "linkageTargetType": "P",
                "mfrIds": parseInt(mfrId),
                "vehicleModelSeriesIds": parseInt(modelId),
                "perPage": perPage,
                "page": 1
            }
        };

        $.ajax({
            url: apiUrl,
            type: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            data: JSON.stringify(engineRequestBody),
            success: function (data) {
                if (data.linkageTargets) {
                    const engines = data.linkageTargets;

                    $.each(engines, function (index, engine) {
                        const beginDate = formatStringDate(engine.beginYearMonth);
                        const endDate = formatStringDate(engine.endYearMonth);
                        const dateRange = `(${beginDate} – ${endDate})`;

                        // Construct a descriptive label: e.g., 1.3 (55 PS) (05.1972 - 07.1978)
                        // PS is roughly HorsePower. The API gives horsePowerFrom.
                        const hp = engine.horsePowerFrom;
                        const kw = engine.kiloWattsFrom;
                        const fuel = engine.fuelType;
                        const description = engine.description;

                        const optionText = `${description} (${hp} PS / ${kw} kW) ${fuel} ${dateRange}`;

                        const $option = $('<option>', {
                            value: engine.linkageTargetId,
                            text: optionText
                        });
                        $engineSelect.append($option);
                    });
                } else {
                    console.error('Unexpected response structure for engines:', data);
                }
            },
            error: function (xhr, status, error) {
                console.error('Error fetching engines:', error);
            }
        });
    });

    // Handle Reset Button
    $('#reset_btn').on('click', function () {
        // Reset Manufacturer to default
        $('#manufacturer_select').val('');

        // Clear and reset Model
        const $modelSelect = $('#model_select');
        $modelSelect.find('option:not(:first)').remove();
        $modelSelect.find('optgroup').remove();
        $modelSelect.val('');

        // Clear and reset Engine
        const $engineSelect = $('#engine_select');
        $engineSelect.find('option:not(:first)').remove();
        $engineSelect.val('');
    });

    // Handle Submit Button
    $('#submit_btn').on('click', function () {
        const mfrId = $('#manufacturer_select').val();
        const modelId = $('#model_select').val();
        const engineId = $('#engine_select').val();

        if (mfrId && modelId && engineId) {
            console.log('Submitted:', {
                manufacturerId: mfrId,
                modelId: modelId,
                engineId: engineId
            });
            alert('Selection Submitted! Check console for details.');
        } else {
            alert('Please select all fields.');
        }
    });
});
