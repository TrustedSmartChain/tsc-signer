import {
  BankExtension,
  createProtobufRpcClient,
  QueryClient,
  setupBankExtension,
  setupStakingExtension,
  StakingExtension,
} from "@cosmjs/stargate";
import { connectComet } from "@cosmjs/tendermint-rpc";
import { PageRequest } from "./generated/cosmos/base/query/v1beta1/pagination.js";
import {
  QueryAdminKeyRequest,
  QueryAdminKeyResponse,
  QueryAdminKeysByLicenseTypeRequest,
  QueryAdminKeysByLicenseTypeResponse,
  QueryAdminKeysRequest,
  QueryAdminKeysResponse,
  QueryLicenseRequest,
  QueryLicenseResponse,
  QueryLicenseTypeRequest,
  QueryLicenseTypeResponse,
  QueryLicenseTypesRequest,
  QueryLicenseTypesResponse,
  QueryLicensesByHolderAndTypeRequest,
  QueryLicensesByHolderAndTypeResponse,
  QueryLicensesByHolderRequest,
  QueryLicensesByHolderResponse,
  QueryLicensesByTypeRequest,
  QueryLicensesByTypeResponse,
  QueryParamsRequest as LicensesQueryParamsRequest,
  QueryParamsResponse as LicensesQueryParamsResponse,
  QueryPermissionsRequest,
  QueryPermissionsResponse,
} from "./generated/licenses/v1/query.js";
import {
  QueryAccountLocksRequest,
  QueryAccountLocksResponse,
  QueryActiveLocksRequest,
  QueryActiveLocksResponse,
  QueryLocksRequest,
  QueryLocksResponse,
  QueryTotalLockedAmountRequest,
  QueryTotalLockedAmountResponse,
} from "./generated/lockup/v1/query.js";
import {
  QueryParamsRequest as DistroQueryParamsRequest,
  QueryParamsResponse as DistroQueryParamsResponse,
} from "./generated/distro/v1/query.js";

const LICENSES_SERVICE = "licenses.v1.Query";
const LOCKUP_SERVICE = "lockup.v1.Query";
const DISTRO_SERVICE = "distro.v1.Query";

export function parsePagination(json?: string): PageRequest | undefined {
  if (!json) return undefined;
  const p = JSON.parse(json) as {
    key?: string;
    offset?: string;
    limit?: string;
    countTotal?: boolean;
    reverse?: boolean;
  };
  return {
    key: p.key ? Buffer.from(p.key, "base64") : Buffer.alloc(0),
    offset: p.offset ?? "0",
    limit: p.limit ?? "0",
    countTotal: p.countTotal ?? false,
    reverse: p.reverse ?? false,
  };
}

export interface LicensesExtension {
  licenses: {
    params(): Promise<LicensesQueryParamsResponse>;
    permissions(): Promise<QueryPermissionsResponse>;
    licenseType(id: string): Promise<QueryLicenseTypeResponse>;
    licenseTypes(pagination?: PageRequest): Promise<QueryLicenseTypesResponse>;
    license(typeId: string, id: string): Promise<QueryLicenseResponse>;
    licensesByType(
      typeId: string,
      pagination?: PageRequest,
    ): Promise<QueryLicensesByTypeResponse>;
    licensesByHolder(
      holder: string,
      pagination?: PageRequest,
    ): Promise<QueryLicensesByHolderResponse>;
    licensesByHolderAndType(
      holder: string,
      typeId: string,
      pagination?: PageRequest,
    ): Promise<QueryLicensesByHolderAndTypeResponse>;
    adminKey(address: string): Promise<QueryAdminKeyResponse>;
    adminKeys(pagination?: PageRequest): Promise<QueryAdminKeysResponse>;
    adminKeysByLicenseType(
      licenseTypeId: string,
      permission: string,
      pagination?: PageRequest,
    ): Promise<QueryAdminKeysByLicenseTypeResponse>;
  };
}

export function setupLicensesExtension(base: QueryClient): LicensesExtension {
  const rpc = createProtobufRpcClient(base);
  return {
    licenses: {
      async params() {
        const data = LicensesQueryParamsRequest.encode({}).finish();
        const bytes = await rpc.request(LICENSES_SERVICE, "Params", data);
        return LicensesQueryParamsResponse.decode(bytes);
      },
      async permissions() {
        const data = QueryPermissionsRequest.encode({}).finish();
        const bytes = await rpc.request(LICENSES_SERVICE, "Permissions", data);
        return QueryPermissionsResponse.decode(bytes);
      },
      async licenseType(id) {
        const data = QueryLicenseTypeRequest.encode({ id }).finish();
        const bytes = await rpc.request(LICENSES_SERVICE, "LicenseType", data);
        return QueryLicenseTypeResponse.decode(bytes);
      },
      async licenseTypes(pagination) {
        const data = QueryLicenseTypesRequest.encode({ pagination }).finish();
        const bytes = await rpc.request(LICENSES_SERVICE, "LicenseTypes", data);
        return QueryLicenseTypesResponse.decode(bytes);
      },
      async license(typeId, id) {
        const data = QueryLicenseRequest.encode({ typeId, id }).finish();
        const bytes = await rpc.request(LICENSES_SERVICE, "License", data);
        return QueryLicenseResponse.decode(bytes);
      },
      async licensesByType(typeId, pagination) {
        const data = QueryLicensesByTypeRequest.encode({ typeId, pagination }).finish();
        const bytes = await rpc.request(LICENSES_SERVICE, "LicensesByType", data);
        return QueryLicensesByTypeResponse.decode(bytes);
      },
      async licensesByHolder(holder, pagination) {
        const data = QueryLicensesByHolderRequest.encode({ holder, pagination }).finish();
        const bytes = await rpc.request(LICENSES_SERVICE, "LicensesByHolder", data);
        return QueryLicensesByHolderResponse.decode(bytes);
      },
      async licensesByHolderAndType(holder, typeId, pagination) {
        const data = QueryLicensesByHolderAndTypeRequest.encode({
          holder,
          typeId,
          pagination,
        }).finish();
        const bytes = await rpc.request(LICENSES_SERVICE, "LicensesByHolderAndType", data);
        return QueryLicensesByHolderAndTypeResponse.decode(bytes);
      },
      async adminKey(address) {
        const data = QueryAdminKeyRequest.encode({ address }).finish();
        const bytes = await rpc.request(LICENSES_SERVICE, "AdminKey", data);
        return QueryAdminKeyResponse.decode(bytes);
      },
      async adminKeys(pagination) {
        const data = QueryAdminKeysRequest.encode({ pagination }).finish();
        const bytes = await rpc.request(LICENSES_SERVICE, "AdminKeys", data);
        return QueryAdminKeysResponse.decode(bytes);
      },
      async adminKeysByLicenseType(licenseTypeId, permission, pagination) {
        const data = QueryAdminKeysByLicenseTypeRequest.encode({
          licenseTypeId,
          permission,
          pagination,
        }).finish();
        const bytes = await rpc.request(
          LICENSES_SERVICE,
          "AdminKeysByLicenseType",
          data,
        );
        return QueryAdminKeysByLicenseTypeResponse.decode(bytes);
      },
    },
  };
}

export interface LockupExtension {
  lockup: {
    activeLocks(pagination?: PageRequest): Promise<QueryActiveLocksResponse>;
    totalLockedAmount(): Promise<QueryTotalLockedAmountResponse>;
    accountLocks(
      addresses: string,
      pagination?: PageRequest,
    ): Promise<QueryAccountLocksResponse>;
    locks(address: string, pagination?: PageRequest): Promise<QueryLocksResponse>;
  };
}

export function setupLockupExtension(base: QueryClient): LockupExtension {
  const rpc = createProtobufRpcClient(base);
  return {
    lockup: {
      async activeLocks(pagination) {
        const data = QueryActiveLocksRequest.encode({ pagination }).finish();
        const bytes = await rpc.request(LOCKUP_SERVICE, "ActiveLocks", data);
        return QueryActiveLocksResponse.decode(bytes);
      },
      async totalLockedAmount() {
        const data = QueryTotalLockedAmountRequest.encode({}).finish();
        const bytes = await rpc.request(LOCKUP_SERVICE, "TotalLockedAmount", data);
        return QueryTotalLockedAmountResponse.decode(bytes);
      },
      async accountLocks(addresses, pagination) {
        const data = QueryAccountLocksRequest.encode({ addresses, pagination }).finish();
        const bytes = await rpc.request(LOCKUP_SERVICE, "AccountLocks", data);
        return QueryAccountLocksResponse.decode(bytes);
      },
      async locks(address, pagination) {
        const data = QueryLocksRequest.encode({ address, pagination }).finish();
        const bytes = await rpc.request(LOCKUP_SERVICE, "Locks", data);
        return QueryLocksResponse.decode(bytes);
      },
    },
  };
}

export interface DistroExtension {
  distro: {
    params(): Promise<DistroQueryParamsResponse>;
  };
}

export function setupDistroExtension(base: QueryClient): DistroExtension {
  const rpc = createProtobufRpcClient(base);
  return {
    distro: {
      async params() {
        const data = DistroQueryParamsRequest.encode({}).finish();
        const bytes = await rpc.request(DISTRO_SERVICE, "Params", data);
        return DistroQueryParamsResponse.decode(bytes);
      },
    },
  };
}

export type TscQueryClient = QueryClient &
  BankExtension &
  StakingExtension &
  LicensesExtension &
  LockupExtension &
  DistroExtension;

export interface QueryConnection {
  client: TscQueryClient;
  disconnect(): void;
}

export async function connectQuery(rpcUrl: string): Promise<QueryConnection> {
  const comet = await connectComet(rpcUrl);
  const client = QueryClient.withExtensions(
    comet,
    setupBankExtension,
    setupStakingExtension,
    setupLicensesExtension,
    setupLockupExtension,
    setupDistroExtension,
  );
  return {
    client,
    disconnect: () => comet.disconnect(),
  };
}
