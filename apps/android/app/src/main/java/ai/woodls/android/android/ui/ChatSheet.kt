package ai.woodls.android.ui

import androidx.compose.runtime.Composable
import ai.woodls.android.MainViewModel
import ai.woodls.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
