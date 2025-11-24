import {createSlice} from '@reduxjs/toolkit'

const initialState = {
    connections : [],
    pendingConnection : [],
    followers : [],
    following : [],
}

export const connectionsSlice = createSlice({
    name: 'connections',
    initialState,  
    reducers: {

    },
})

export default connectionsSlice.reducer;