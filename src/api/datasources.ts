import Logger from "../utils/logger.js";
import storyblokConfig from "../config/config.js";
import { sbApi } from "./config.js";
import {
    LOOKUP_TYPE,
    SCOPE,
    discoverManyDatasources,
    discoverDatasources,
} from "../utils/discover.js";
import { getFilesContentWithRequire } from "../utils/main.js";

const { spaceId } = storyblokConfig;

// GET
export const getAllDatasources = () => {
    Logger.log("Trying to get all Datasources.");

    return sbApi
        .get(`spaces/${spaceId}/datasources/`)
        .then(({ data }) => data)
        .catch((err) => {
            if (err.response.status === 404) {
                Logger.error(
                    `There is no datasources in your Storyblok ${spaceId} space.`
                );
                return true;
            } else {
                Logger.error(err);
                return false;
            }
        });
};

export const getDatasource = (datasourceName: string | undefined) => {
    Logger.log(`Trying to get '${datasourceName}' datasource.`);

    return getAllDatasources()
        .then((res) => {
            if (res) {
                return res.datasources.filter(
                    (datasource: any) => datasource.name === datasourceName
                );
            }
        })
        .then((res) => {
            if (Array.isArray(res) && res.length === 0) {
                Logger.warning(
                    `There is no datasource named '${datasourceName}'`
                );
                return false;
            }
            return res;
        })
        .catch((err) => Logger.error(err));
};

export const getDatasourceEntries = async (datasourceName: string) => {
    Logger.log(`Trying to get '${datasourceName}' datasource entries.`);

    const data = await getDatasource(datasourceName);

    if (data) {
        return sbApi
            .get(`spaces/${spaceId}/datasource_entries/`, {
                datasource_id: data[0].id,
            } as any)
            .then(async (response: any) => {
                const { data } = response;
                return data;
            })
            .catch((err) => Logger.error(err));
    }
};

export const createDatasource = (datasource: any) =>
    sbApi
        .post(`spaces/${spaceId}/datasources/`, {
            datasource: {
                name: datasource.name,
                slug: datasource.slug,
                dimensions: [...datasource.dimensions],
                dimensions_attributes: [...datasource.dimensions],
            },
        } as any)
        .then(({ data }: any) => ({
            data,
            datasource_entries: datasource.datasource_entries,
        }))
        .catch((err) => Logger.error(err));

export const createDatasourceEntry = (
    datasourceEntry: any,
    datasourceId: string
) => {
    return sbApi
        .post(`spaces/${spaceId}/datasource_entries/`, {
            datasource_entry: {
                name: Object.values(datasourceEntry)[0],
                value: Object.values(datasourceEntry)[1],
                datasource_id: datasourceId,
            },
        } as any)
        .then(({ data }: any) => {
            return data;
        })
        .catch((err) => Logger.error(err));
};

export const updateDatasourceEntry = (
    datasourceEntry: any,
    datasourceId: string,
    datasourceToBeUpdated: any
) => {
    console.log(" ");
    console.log("updateDatasrouceEntry");
    console.log("#############");
    console.log({ datasourceEntry, datasourceId, datasourceToBeUpdated });
    console.log("#############");
    console.log(" ");

    const final = {
        name: datasourceEntry.name,
        value: datasourceEntry.value,
        datasource_id: datasourceId,
        id: datasourceToBeUpdated.id,
    };

    for (const item in datasourceEntry.dimension_value) {
        console.log(item, " ", datasourceEntry.dimension_value[item]);
    }

    console.log("??????????????????????????????????");
    console.log("??????????????????????????????????");
    console.log(final);
    console.log("??????????????????????????????????");
    console.log("??????????????????????????????????");

    return sbApi
        .put(
            `spaces/${spaceId}/datasource_entries/${datasourceToBeUpdated.id}`,
            {
                datasource_entry: final,
            } as any
        )
        .then(({ data }: any) => {
            return data;
        })
        .catch((err) => Logger.error(err));
};

export const updateDatasource = (
    datasource: any,
    datasourceToBeUpdated: any
) => {
    console.log("Nalezy sie update");
    const dimensionsToCreate = datasource.dimensions.filter(
        (dimension: { name: string; entry_value: string }) => {
            const isDimensionInRemoteDatasource =
                datasourceToBeUpdated.dimensions.find(
                    (d: { name: string; entry_value: string }) =>
                        dimension.name === d.name
                );
            return !isDimensionInRemoteDatasource;
        }
    );

    return sbApi
        .put(`spaces/${spaceId}/datasources/${datasourceToBeUpdated.id}`, {
            datasource: {
                id: datasourceToBeUpdated.id,
                name: datasource.name,
                slug: datasource.slug,
                dimensions: [
                    ...datasourceToBeUpdated.dimensions,
                    ...dimensionsToCreate,
                ],
                dimensions_attributes: [
                    ...datasourceToBeUpdated.dimensions,
                    ...dimensionsToCreate,
                ],
            },
        } as any)
        .then(({ data }: any) => {
            return {
                data,
                datasource_entries: datasource.datasource_entries,
            };
        })
        .catch((err) => Logger.error(err));
};

export const createDatasourceEntries = (
    datasourceId: string,
    datasource_entries: any,
    remoteDatasourceEntries: any
) => {
    Promise.all(
        datasource_entries.map((datasourceEntry: any) => {
            const datasourceEntriesToBeUpdated =
                remoteDatasourceEntries.datasource_entries.find(
                    (remoteDatasourceEntry: any) =>
                        remoteDatasourceEntry.name ===
                        Object.values(datasourceEntry)[0]
                );
            if (datasourceEntriesToBeUpdated) {
                return updateDatasourceEntry(
                    datasourceEntry,
                    datasourceId,
                    datasourceEntriesToBeUpdated
                );
            }
            return createDatasourceEntry(datasourceEntry, datasourceId);
        })
    )
        .then(({ data }: any) => {
            Logger.success(
                `Datasource entries for ${datasourceId} datasource id has been successfully synced.`
            );
            return data;
        })
        .catch((err) => Logger.error(err));
};

interface SyncDatasources {
    providedDatasources: string[];
}

export const syncDatasources = async ({
    providedDatasources,
}: SyncDatasources) => {
    Logger.log(`Trying to sync provided datasources: `);
    console.log(providedDatasources);

    const providedDatasourcesContent = getFilesContentWithRequire({
        files: providedDatasources,
    });
    const remoteDatasources = await getAllDatasources();

    Promise.all(
        providedDatasourcesContent.map((datasource: any) => {
            const datasourceToBeUpdated = remoteDatasources.datasources.find(
                (remoteDatasource: any) =>
                    datasource.name === remoteDatasource.name
            );
            if (datasourceToBeUpdated) {
                return updateDatasource(datasource, datasourceToBeUpdated);
            }
            return createDatasource(datasource);
        })
    )
        .then((res) => {
            res.map(async ({ data, datasource_entries }: any) => {
                const remoteDatasourceEntries = await getDatasourceEntries(
                    data.datasource.name
                );

                console.log("##########");
                console.log("remoteDatasourceEntries");
                console.log(remoteDatasourceEntries);
                console.log("##########");

                console.log("!!!!!!!!!!!!!!!!!");
                console.log("my local datsousrce entries");
                console.log(datasource_entries);
                console.log("!!!!!!!!!!!!!!!!!");

                createDatasourceEntries(
                    data.datasource.id,
                    datasource_entries,
                    remoteDatasourceEntries
                );
            });
            return res;
        })
        .catch((err) => {
            console.log(err);
            Logger.warning("There is error inside promise.all from datasource");
            return false;
        });
};

interface SyncProvidedDatasources {
    datasources: string[];
}

export const syncProvidedDatasources = ({
    datasources,
}: SyncProvidedDatasources) => {
    const allLocalDatasources = discoverManyDatasources({
        scope: SCOPE.local,
        type: LOOKUP_TYPE.fileName,
        fileNames: datasources,
    });

    const allExternalDatasources = discoverManyDatasources({
        scope: SCOPE.external,
        type: LOOKUP_TYPE.fileName,
        fileNames: datasources,
    });

    syncDatasources({
        providedDatasources: [
            ...allLocalDatasources,
            ...allExternalDatasources,
        ],
    });
};

export const syncAllDatasources = () => {
    const allLocalDatasources = discoverDatasources({
        scope: SCOPE.local,
        type: LOOKUP_TYPE.fileName,
    });

    const allExternalDatasources = discoverDatasources({
        scope: SCOPE.external,
        type: LOOKUP_TYPE.fileName,
    });

    syncDatasources({
        providedDatasources: [
            ...allLocalDatasources,
            ...allExternalDatasources,
        ],
    });
};
