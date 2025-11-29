// components/store/address-selector.tsx
interface Address {
  id: string
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  state: string
  zipCode: string
  country: string
  isDefault: boolean
}

interface AddressSelectorProps {
  addresses: Address[]
  selectedAddressId?: string
  onAddressSelect: (addressId: string) => void
  onNewAddress: () => void
}

export function AddressSelector({
  addresses,
  selectedAddressId,
  onAddressSelect,
  onNewAddress
}: AddressSelectorProps) {
  if (addresses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">No saved addresses found</p>
        <button
          type="button"
          onClick={onNewAddress}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add New Address
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {addresses.map((address) => (
        <div
          key={address.id}
          className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
            selectedAddressId === address.id
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={() => onAddressSelect(address.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <input
                type="radio"
                checked={selectedAddressId === address.id}
                onChange={() => onAddressSelect(address.id)}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium">
                  {address.firstName} {address.lastName}
                  {address.isDefault && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-gray-600 text-sm mt-1">
                  <div>{address.address1}</div>
                  {address.address2 && <div>{address.address2}</div>}
                  <div>
                    {address.city}, {address.state} {address.zipCode}
                  </div>
                  <div>{address.country}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onNewAddress}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
      >
        + Add New Address
      </button>
    </div>
  )
}